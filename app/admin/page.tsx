'use client';

export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtime } from '@/lib/realtime-client';
// ── All Supabase-backed functions + types ──────────────────────────────────────
import {
  getOrders, updateOrderStatus as apiUpdateOrderStatus, applyDiscount as apiApplyDiscount,
  computeOnlineOrderStats, OnlineOrderStats,
  getTables as getTablesApi, getTabs as getTabsApi,
  createTable as createTableApi, updateTable as updateTableApi, deleteTable as deleteTableApi,
  getMenu as getMenuApi, saveMenuItem as saveMenuItemApi, deleteMenuItem as deleteMenuItemApi,
  Table, MenuItem, WaiterStats, TableOccupancyStats,
  Order,
  getSettings, saveSettings, saveSetting,
  listStaff, addStaff, patchStaff, removeStaff, StaffMember,
  getAllIssues, OrderIssue,
  forceCloseTab,
} from '@/lib/api';
import {
  getSession, clearSession, AuthSession,
  SECURITY_QUESTIONS,
} from '@/lib/auth';

// ─── Constants ────────────────────────────────────────────────────────────────
// Dine-in flow:  awaiting_waiter→pending→preparing→prepared→served→completed
// Pickup flow:   pending→preparing→prepared→served→completed   (same as dine-in after accepted)
// Delivery flow: pending→preparing→prepared→out_for_delivery→delivered→completed
// NOTE: awaiting_waiter is prepended for dine-in so admin can accept the order if waiter is unavailable.
const STATUS_FLOW_DINE_IN  = ['awaiting_waiter','pending','preparing','prepared','served','completed'] as const;
const STATUS_FLOW_PICKUP   = ['pending','preparing','prepared','served','completed'] as const;
const STATUS_FLOW_DELIVERY = ['pending','preparing','prepared','out_for_delivery','delivered','completed'] as const;
const CATEGORIES  = [
  'Veg Starters','Non Veg Starters',
  'Veg Biryani','Non Veg Biryani',
  'Main Course Veg','Main Course Non Veg',
  'Tandoori Specials','Rice Items',
  'Indian Breads','Egg Specials',
  'Pot Specials','Arabic Mandi',
];
const BADGE_LABEL : Record<string,string> = { bestseller:'⭐ Bestseller', popular:'🔥 Popular', chef:"👨‍🍳 Chef's Special", famous:'🏆 Famous', new:'✨ New' };
const STATUS_COLOR: Record<string,string> = {
  awaiting_waiter:   '#f59e0b', pending:'#f59e0b', preparing:'#3b82f6',
  prepared:          '#8b5cf6', served:'#06b6d4', completed:'#16a34a',
  out_for_delivery:  '#2563eb', delivered:'#7c3aed',
  re_serve_required: '#dc2626',
  cancelled:         '#ef4444', void:'#9ca3af',
};
const STATUS_LABEL_MAP: Record<string,string> = {
  awaiting_waiter:   'Awaiting Waiter', pending:'In Queue', preparing:'Preparing',
  prepared:          'Ready', served:'Served', completed:'Completed',
  out_for_delivery:  '🛵 Out for Delivery', delivered:'📦 Delivered',
  re_serve_required: '🚨 Re-Serve Required',
  cancelled:         'Cancelled', void:'Void',
};

// ─── Style helpers ────────────────────────────────────────────────────────────
const card  = (color='#E65C00') => ({ background:'white' as const, borderRadius:12, padding:'1.4rem', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', marginBottom:'1.5rem', borderLeft:`4px solid ${color}` });
const tabB  = (active:boolean)  => ({ padding:'0.42rem 1rem', border:`2px solid ${active?'#E65C00':'#ddd'}`, borderRadius:20, background:active?'#E65C00':'white' as const, color:active?'white' as const:'#666' as const, fontWeight:600 as const, cursor:'pointer' as const, fontSize:'0.8rem', fontFamily:'Poppins,sans-serif' });
const inp   = { width:'100%', padding:'0.6rem 0.75rem', border:'2px solid #e5e7eb', borderRadius:8, fontFamily:'Poppins,sans-serif', fontSize:'0.88rem', outline:'none' as const };
const btn   = (bg='#E65C00',c='white') => ({ background:bg, color:c, border:'none', padding:'0.55rem 1.1rem', borderRadius:8, fontWeight:700 as const, cursor:'pointer' as const, fontFamily:'Poppins,sans-serif', fontSize:'0.84rem' });
const emptyItem = ():Partial<MenuItem> => ({ category:'Non Veg Biryani', name:'', desc:'', price:0, img:'', badge:'', available:true, variants:[] });

const AnalyticsCharts = lazy(() => import('@/components/AnalyticsCharts'));

export default function AdminPage() {
  const [orders,      setOrders]      = useState<Order[]>([]);
  const [tables,      setTables]      = useState<Table[]>([]);
  // Live table status derived from Supabase (customer_tabs + tables API)
  const [liveTables,  setLiveTables]  = useState<(Table & { sessionStart?: string; sessionTabId?: string })[]>([]);
  const [menu,        setMenu]        = useState<MenuItem[]>([]);
  const [clock,   setClock]   = useState({ date:'', time:'' });

  // ── Auth ──
  const router                          = useRouter();
  const [authSession, setAuthSession]   = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked]   = useState(false);

  // ── Navigation ──
  type Section = 'overview'|'orders'|'sales'|'menu'|'tables'|'fraud'|'staff';
  const [section, setSection] = useState<Section>('overview');

  // ── Tabs / filters ──
  const [salesTab,    setSalesTab]    = useState<'today'|'week'|'month'|'all'>('today');
  const [orderFilter, setOrderFilter] = useState('all');
  const [menuFilter,  setMenuFilter]  = useState('All');

  // ── Modals ──
  const [selOrder,      setSelOrder]      = useState<Order|null>(null);
  const [menuModal,     setMenuModal]     = useState<{open:boolean;item:Partial<MenuItem>;isEdit:boolean}>({open:false,item:emptyItem(),isEdit:false});
  // modalVariants: separate state for the variants editor inside the menu modal
  // Uses string prices so the input fields can be empty/partial while typing
  const [modalVariants, setModalVariants] = useState<{name:string;price:string}[]>([{name:'',price:''}]);
  const [imgUploading,   setImgUploading]   = useState(false);
  const [seedingMenu,    setSeedingMenu]     = useState(false);
  const [seedMsg,        setSeedMsg]         = useState('');
  const [csvImportMsg,   setCsvImportMsg]    = useState('');
  const [cancelModal,   setCancelModal]   = useState<{open:boolean;orderId:string}>({open:false,orderId:''});
  const [discountModal, setDiscountModal] = useState<{open:boolean;orderId:string}>({open:false,orderId:''});

  // ── Form values ──
  const [cancelReason, setCancelReason] = useState('');
  const [discAmt,      setDiscAmt]      = useState('');
  const [discNote,     setDiscNote]     = useState('');
  const [pinInput,     setPinInput]     = useState('');
  const [pinMsg,       setPinMsg]       = useState('');
  const [showPinMgr,   setShowPinMgr]   = useState(false);
  const [newPin,       setNewPin]       = useState('');
  const [newPinMsg,    setNewPinMsg]    = useState('');

  // ── Analytics state ──
  const [waiterStats,    setWaiterStats]    = useState<WaiterStats[]>([]);
  const [tableOccupancy, setTableOccupancy] = useState<TableOccupancyStats[]>([]);
  const [onlineStats,    setOnlineStats]    = useState<OnlineOrderStats | null>(null);

  // ── Issue analytics state ──
  const [todayIssues,    setTodayIssues]    = useState<OrderIssue[]>([]);

  // ── Closed tabs count (for EOD report) ──
  const [closedTabsCount, setClosedTabsCount] = useState(0);

  // ── Staff management state ──
  const [staffAccounts, setStaffAccounts] = useState<StaffMember[]>([]);
  const [staffForm,  setStaffForm]  = useState({ name: '', username: '', pin: '' });
  const [staffMsg,   setStaffMsg]   = useState('');
  // kitchenPin / managerPin are write-only form fields for setting a NEW pin.
  // They are never pre-filled with the current value — PINs are never sent to the browser.
  const [kitchenPin, setKitchenPin] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [kitchenPinMsg, setKitchenPinMsg] = useState('');
  const [managerPinMsg, setManagerPinMsg] = useState('');
  const [editPinId,  setEditPinId]  = useState('');
  const [editPinVal, setEditPinVal] = useState('');

  // ── Delivery accounts state ──
  const [deliveryAccounts,  setDeliveryAccounts]  = useState<StaffMember[]>([]);
  const [deliveryForm,      setDeliveryForm]      = useState({ name: '', username: '', pin: '' });
  const [deliveryMsg,       setDeliveryMsg]       = useState('');
  const [editDelivPinId,    setEditDelivPinId]    = useState('');
  const [editDelivPinVal,   setEditDelivPinVal]   = useState('');

  // ── Table management state ──
  const [tableForm,    setTableForm]    = useState({ name: '', capacity: '4' });
  const [tableMsg,     setTableMsg]     = useState('');
  const [editTableId,  setEditTableId]  = useState('');       // id of table being edited inline
  const [editTableVal, setEditTableVal] = useState({ name: '', capacity: '4' });

  // ── Admin PIN change state ──
  const [adminNewPin,    setAdminNewPin]    = useState('');
  const [adminNewPin2,   setAdminNewPin2]   = useState('');
  const [adminPinOld,    setAdminPinOld]    = useState('');
  const [adminPinMsg,    setAdminPinMsg]    = useState('');

  // ── Security question state ──
  const [secQuestion,    setSecQuestion]    = useState('');
  const [secAnswer,      setSecAnswer]      = useState('');
  const [secAnswerConf,  setSecAnswerConf]  = useState('');
  const [secMsg,         setSecMsg]         = useState('');
  const [secSetup,       setSecSetup]       = useState<{ question: string; setupAt: string } | null>(null);

  // ── Data refresh ──
  const refresh = useCallback(async () => {
    // ── Orders: fetched from Supabase (NOT localStorage) ──────────────────────
    try {
      // Fetch ALL of today's orders (active + completed + cancelled) so that
      // admin analytics (EOD totals, cancel rate, waiter stats, discount log)
      // have access to the full picture.  We bound by "since midnight today" so
      // we never pull unbounded history. The server caps at 200 rows.
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const liveOrders = await getOrders({ since: todayMidnight.toISOString(), limit: 200 });
      setOrders(liveOrders);

      // Compute online/pickup/delivery stats from the same live data.
      // This replaces getOnlineOrderStats() from lib/storage which read localStorage.
      const stats = computeOnlineOrderStats(liveOrders);
      setOnlineStats(stats);

    } catch (e) {
      console.error('[Admin] Failed to load orders from Supabase:', e);
    }
    // ── Issue analytics: fetch all today's issues ──────────────────────────────
    try {
      const allIssues = await getAllIssues();
      const todayMidnight2 = new Date(); todayMidnight2.setHours(0, 0, 0, 0);
      setTodayIssues(allIssues.filter(i => new Date(i.createdAt) >= todayMidnight2));
    } catch (e) {
      console.error('[Admin] Failed to load issues from Supabase:', e);
    }
    // ── Live table occupancy + waiter stats: derived from Supabase customer_tabs ──
    // waiter_name lives on customer_tabs (not orders), so we compute accountability
    // stats here by aggregating today's open and recently closed tabs per waiter.
    try {
      const todayMidnightTs = new Date();
      todayMidnightTs.setHours(0, 0, 0, 0);
      const todayMidnightIso = todayMidnightTs.toISOString();
      const [apiTables, openTabs, closedTabs] = await Promise.all([
        getTablesApi(),
        // All open tabs regardless of age — we need these for occupancy + stale detection
        getTabsApi('open'),
        // Only today's closed tabs for waiter stats — avoids fetching all-time history
        getTabsApi('closed', todayMidnightIso),
      ]);

      // ── Waiter accountability from today's tabs ─────────────────────────────
      // openTabs are filtered to today for stats (but ALL open tabs used for occupancy)
      const todayTabs = [
        ...openTabs.filter(t => new Date(t.createdAt) >= todayMidnightTs),
        ...closedTabs,   // already filtered to today on the server
      ];
      const byWaiter = new Map<string, { accepted: number; served: number }>();
      todayTabs.forEach(t => {
        const name = t.waiterName || 'Unassigned';
        if (!byWaiter.has(name)) byWaiter.set(name, { accepted: 0, served: 0 });
        const w = byWaiter.get(name)!;
        w.accepted++;
        if (t.status === 'closed') w.served++;
      });
      const liveWaiterStats: WaiterStats[] = Array.from(byWaiter.entries()).map(([name, s]) => ({
        name,
        ordersAccepted:   s.accepted,
        ordersCancelled:  0,        // tabs are not cancelled — only closed
        ordersServed:     s.served,
        cancellationRate: 0,
      }));
      setWaiterStats(liveWaiterStats);
      // Build a map: tableId → first open tab (sessionStart + tabId for force-close)
      const openByTableId = new Map<string, { tabId: string; createdAt: string }>();
      openTabs.forEach(tab => {
        if (tab.tableId && !openByTableId.has(tab.tableId)) {
          openByTableId.set(tab.tableId, { tabId: tab.id, createdAt: tab.createdAt });
        }
      });
      const computed = apiTables.map(t => ({
        ...t,
        status:       openByTableId.has(t.id) ? ('occupied' as const) : ('available' as const),
        sessionStart: openByTableId.get(t.id)?.createdAt  ?? undefined,
        sessionTabId: openByTableId.get(t.id)?.tabId      ?? undefined,
      }));
      // Sort by numeric suffix so T1, T2, ... T10 appear in order
      computed.sort((a, b) => {
        const na = parseInt(a.id.match(/(\d+)$/)?.[1] ?? '0', 10);
        const nb = parseInt(b.id.match(/(\d+)$/)?.[1] ?? '0', 10);
        return na - nb;
      });
      setLiveTables(computed);
      // Store closed-tab count for EOD report completedTabs metric
      setClosedTabsCount(closedTabs.length);
    } catch (e) {
      console.error('[Admin] Failed to load live tables from Supabase:', e);
    }
    // ── Menu from Supabase (replaces getMenu() from localStorage) ─────────────
    try {
      const menuItems = await getMenuApi();
      setMenu(menuItems as MenuItem[]);
    } catch { /* keep existing menu if fetch fails */ }
    // ── Staff & settings from Supabase ──────────────────────────────────────────
    try {
      const [waiters, deliveryStaff, settings] = await Promise.all([
        listStaff('waiter'),
        listStaff('delivery'),
        getSettings(),
      ]);
      setStaffAccounts(waiters);
      setDeliveryAccounts(deliveryStaff);
      // PINs are intentionally NOT loaded into client state — server-side only.
      setSecSetup(settings.security_question
        ? { question: settings.security_question, setupAt: settings.security_setup_at ?? '' }
        : null
      );
    } catch (e) {
      console.error('[Admin] Failed to load settings/staff from Supabase:', e);
    }
    // waiterStats is derived from today's tabs inside the tables/tabs try-block above.
    // tableOccupancy requires per-table historical duration data — kept empty (section
    // is conditionally hidden when empty) until a dedicated analytics endpoint is added.
    setTableOccupancy([]);
  }, []);

  // ── Auth check ──
  useEffect(() => {
    const s = getSession('admin');
    if (!s) { router.replace('/admin/login'); return; }
    setAuthSession(s);
    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    refresh();
    const t1 = setInterval(refresh, 5000);
    const t2 = setInterval(() => {
      const n = new Date();
      setClock({ date: n.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}), time: n.toLocaleTimeString() });
    }, 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [refresh, authChecked]);

  // ── Realtime: instant refresh on any order event (no wait for 5s poll) ──────
  // Covers: new online orders, status changes, completions, payments
  useRealtime(
    process.env.NEXT_PUBLIC_RESTAURANT_ID ?? 'rest_default',
    {
      order_created:          () => { void refresh(); },
      order_status_changed:   () => { void refresh(); },
      order_ready:            () => { void refresh(); },
      order_served:           () => { void refresh(); },
      order_out_for_delivery: () => { void refresh(); },
      order_delivered:        () => { void refresh(); },
      payment_completed:      () => { void refresh(); },
      order_issue_reported:   () => { void refresh(); },
      order_issue_escalated:  () => { void refresh(); },
      order_issue_resolved:   () => { void refresh(); },
    },
  );

  function adminLogout() {
    clearSession('admin');
    router.replace('/admin/login');
  }

  // ─── Today stats ──────────────────────────────────────────────────────────
  const todayStr      = new Date().toDateString();
  // todayOrders: all non-cancelled, non-void orders for today (used for counts + discount totals)
  const todayOrders   = orders.filter(o => new Date(o.timestamp).toDateString()===todayStr && !['cancelled','void'].includes(o.status));
  // todayRevenue: only COMPLETED orders — money actually collected, not in-progress
  const todayRevenue  = orders.filter(o => new Date(o.timestamp).toDateString()===todayStr && o.status==='completed').reduce((s,o)=>s+(o.total||0),0);
  const todayDiscount = todayOrders.reduce((s,o)=>s+(o.discount||0),0);
  const todayCancel   = orders.filter(o => o.status === 'cancelled' && new Date(o.timestamp).toDateString()===todayStr);
  // Active tables: count of tables with status 'occupied' from live Supabase data.
  const activeTables  = liveTables.filter(t => t.status === 'occupied').length;
  // Pending count: include awaiting_waiter (new dine-in orders) AND pending (kitchen queue).
  // Dine-in orders start at 'awaiting_waiter', never 'pending', so omitting it means
  // every fresh dine-in order is silently missed in this count.
  const pendingCount  = orders.filter(o => ['awaiting_waiter', 'pending'].includes(o.status)).length;

  // ─── Issue analytics ────────────────────────────────────────────────────────
  const issueTotal      = todayIssues.length;
  const issueOpen       = todayIssues.filter(i => ['open', 'reserving'].includes(i.status)).length;
  const issueEscalated  = todayIssues.filter(i => i.escalated || i.status === 'escalated').length;
  const issueResolved   = todayIssues.filter(i => i.status === 'resolved').length;
  const issueRate       = todayOrders.length > 0 ? ((issueTotal / todayOrders.length) * 100).toFixed(1) : '0.0';

  // ─── Order actions ────────────────────────────────────────────────────────
  async function advance(id:string) {
    const o = orders.find(x=>x.id===id);
    if (!o) return;

    // Use type-aware status flow — each order type has its own lifecycle
    // delivery: prepared → out_for_delivery → delivered → completed
    // pickup:   prepared → served (customer collects at counter) → completed
    // dine-in:  awaiting_waiter → pending → … → served → completed
    const flow =
      o.type === 'delivery' ? STATUS_FLOW_DELIVERY :
      o.type === 'pickup'   ? STATUS_FLOW_PICKUP   :
      STATUS_FLOW_DINE_IN;

    // Find current position in the appropriate flow
    const curIdx = (flow as readonly string[]).indexOf(o.status);
    // Guard: unknown status (e.g. awaiting_waiter, cancelled) or already at final step
    if (curIdx === -1 || curIdx >= flow.length - 1) return;

    const next = flow[curIdx + 1];

    try {
      await apiUpdateOrderStatus(id, next, 'Admin');
      await refresh();
      // Close detail modal if open for this order (it will reopen with fresh data if needed)
      if (selOrder?.id === id) setSelOrder(null);
    } catch (e) {
      console.error('[Admin] advance() failed:', e);
      alert('Failed to advance order status. Please try again.');
    }
  }

  async function doCancel() {
    if (!cancelReason.trim()) { alert('Please enter a reason'); return; }
    try {
      await apiUpdateOrderStatus(cancelModal.orderId, 'cancelled', 'Admin', { cancelReason });
      setCancelModal({open:false,orderId:''}); setCancelReason('');
      await refresh();
      if (selOrder?.id === cancelModal.orderId) setSelOrder(null);
    } catch (e) {
      console.error('[Admin] doCancel() failed:', e);
      alert('This order could not be cancelled. Please try again.');
      setCancelModal({open:false,orderId:''}); setCancelReason('');
    }
  }

  async function doDiscount() {
    const amt = parseInt(discAmt);
    if (!amt || amt <= 0) { alert('Enter a valid amount'); return; }

    // Validate discount does not exceed the order total
    const targetOrder = orders.find(o => o.id === discountModal.orderId);
    if (targetOrder) {
      const maxDiscount = targetOrder.subtotal || targetOrder.total;
      if (amt > maxDiscount) {
        alert(`Discount (₹${amt}) cannot exceed the order subtotal (₹${maxDiscount}).`);
        return;
      }
    }

    // Verify admin PIN server-side — PIN never stored in client state
    setPinMsg('⏳ Verifying…');
    try {
      const verifyRes = await fetch('/api/auth/verify-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ role: 'admin', pin: pinInput }),
      });
      const verifyResult = await verifyRes.json() as { ok: boolean; error?: string };
      if (!verifyResult.ok) { setPinMsg(`❌ ${verifyResult.error ?? 'Wrong PIN'}`); return; }
    } catch {
      setPinMsg('❌ Could not verify PIN. Try again.');
      return;
    }
    try {
      await apiApplyDiscount(discountModal.orderId, amt, discNote||'Owner discount');
      setDiscountModal({open:false,orderId:''}); setDiscAmt(''); setDiscNote(''); setPinInput(''); setPinMsg('');
      await refresh();
    } catch (e) {
      console.error('[Admin] doDiscount() failed:', e);
      alert('Failed to apply discount. Please try again.');
    }
  }

  // ─── Menu CRUD ────────────────────────────────────────────────────────────
  function addVariantRow() {
    setModalVariants(v => [...v, {name:'',price:''}]);
  }
  function removeVariantRow(idx:number) {
    setModalVariants(v => v.filter((_,i)=>i!==idx));
  }
  function updateVariantRow(idx:number, field:'name'|'price', val:string) {
    setModalVariants(v => v.map((r,i)=>i===idx?{...r,[field]:val}:r));
  }

  async function saveItem() {
    const it = menuModal.item;
    if (!it.name?.trim()) { alert('Item name required'); return; }
    // Validate variants
    const filled = modalVariants.filter(v=>v.name.trim()||v.price.trim());
    if (filled.length === 0) { alert('Add at least one pricing variant'); return; }
    for (const v of filled) {
      if (!v.name.trim()) { alert('Each variant needs a name (e.g. Half, Full, Regular)'); return; }
      const p = parseFloat(v.price);
      if (isNaN(p)||p<=0) { alert(`Invalid price for variant "${v.name}"`); return; }
    }
    const variants = filled.map(v=>({ name:v.name.trim(), price:parseFloat(v.price) }));
    const price = variants[0].price; // backward compat
    try {
      await saveMenuItemApi({
        id:        menuModal.isEdit ? it.id : undefined,
        name:      it.name     || '',
        category:  it.category || CATEGORIES[0],
        price,
        variants,
        desc:      it.desc     || '',
        img:       it.img      || '',
        badge:     it.badge    || '',
        available: it.available !== false,
      });
      setMenuModal({open:false,item:emptyItem(),isEdit:false});
      setModalVariants([{name:'',price:''}]);
      void refresh();
    } catch (e) {
      alert('Failed to save menu item: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // ─── Image upload ─────────────────────────────────────────────────────────
  async function uploadMenuImage(file: File) {
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5 MB'); return; }
    setImgUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res  = await fetch('/api/menu/upload', { method: 'POST', body: form });
      const data = await res.json() as { ok: boolean; url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed');
      setMenuModal(m => ({ ...m, item: { ...m.item, img: data.url } }));
    } catch (e) {
      alert('Upload failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setImgUploading(false);
    }
  }

  // ─── Import complete menu catalog ─────────────────────────────────────────
  async function importMenuCatalog() {
    if (!confirm('Add all missing menu items from the complete catalog?\n\nExisting items will NOT be changed.')) return;
    setSeedingMenu(true);
    setSeedMsg('');
    try {
      const res  = await fetch('/api/menu/seed');
      const data = await res.json() as { ok: boolean; inserted?: number; skipped?: number; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Seed failed');
      setSeedMsg(`✅ ${data.inserted} items added, ${data.skipped} already existed.`);
      void refresh();
    } catch (e) {
      setSeedMsg('❌ ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSeedingMenu(false);
    }
  }

  // ─── CSV template download ────────────────────────────────────────────────
  function downloadCsvTemplate() {
    const rows = [
      'name,category,description,badge,available,variants,image_url',
      '"Chicken Dum Biryani","Non Veg Biryani","Authentic Hyderabadi Dum Biryani","bestseller","true","Half:140|Full:260","https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400"',
      '"Roti","Indian Breads","Soft whole wheat flatbread baked fresh","","true","Regular:10",""',
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'menu-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ─── CSV import ───────────────────────────────────────────────────────────
  async function importMenuFromCsv(file: File) {
    setCsvImportMsg('⏳ Importing…');
    try {
      const text  = await file.text();
      const lines = text.trim().split('\n').filter(l => l.trim());
      if (lines.length < 2) { setCsvImportMsg('❌ CSV has no data rows'); return; }
      const parseRow = (line: string): string[] => {
        const cols: string[] = []; let cur = '', inQ = false;
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
          else { cur += ch; }
        }
        cols.push(cur.trim()); return cols;
      };
      const header = parseRow(lines[0]).map(h => h.toLowerCase());
      const idx = (k: string) => header.indexOf(k);
      if (idx('name') === -1 || idx('category') === -1) { setCsvImportMsg('❌ CSV must have "name" and "category" columns'); return; }
      let inserted = 0, failed = 0;
      for (let i = 1; i < lines.length; i++) {
        const c = parseRow(lines[i]);
        const name = c[idx('name')] ?? ''; const category = c[idx('category')] ?? '';
        if (!name || !category) continue;
        let variants: { name: string; price: number }[] = [];
        const vStr = c[idx('variants')] ?? '';
        if (vStr) { variants = vStr.split('|').map(v => { const [n,p] = v.split(':'); return { name: (n??'').trim(), price: parseFloat(p??'0') }; }).filter(v => v.name && !isNaN(v.price) && v.price > 0); }
        if (!variants.length) variants = [{ name: 'Regular', price: 0 }];
        try {
          await saveMenuItemApi({ name, category, desc: c[idx('description')]??'', badge: c[idx('badge')]??'', img: c[idx('image_url')]??'', available: (c[idx('available')]??'true').toLowerCase()!=='false', variants, price: variants[0].price });
          inserted++;
        } catch { failed++; }
      }
      setCsvImportMsg(`✅ Imported ${inserted} items${failed ? `, ${failed} failed` : ''}.`);
      void refresh();
    } catch (e) { setCsvImportMsg('❌ ' + (e instanceof Error ? e.message : String(e))); }
  }

  // ─── Sales data ───────────────────────────────────────────────────────────
  // Filter live Supabase orders by the selected time period
  function filterByPeriod(allOrders: Order[], period: typeof salesTab): Order[] {
    const now = new Date();
    return allOrders.filter(o => {
      const ts = new Date(o.timestamp);
      if (period === 'today') return ts.toDateString() === now.toDateString();
      if (period === 'week')  { const s = new Date(now); s.setDate(s.getDate() - 7);  return ts >= s; }
      if (period === 'month') { const s = new Date(now); s.setDate(s.getDate() - 30); return ts >= s; }
      return true; // 'all'
    });
  }
  // Exclude cancelled and void orders from Sales Report — they don't represent real revenue.
  // filterByPeriod scopes to the selected time window; we then strip non-revenue statuses.
  const periodOrders = filterByPeriod(orders, salesTab).filter(o => !['cancelled','void'].includes(o.status));
  const pTotal  = periodOrders.reduce((s,o)=>s+(o.total||0),0);
  const pGross  = periodOrders.reduce((s,o)=>s+(o.subtotal||o.total||0),0);
  const pDisc   = periodOrders.reduce((s,o)=>s+(o.discount||0),0);
  const pCount  = periodOrders.length;
  const pAvg    = pCount>0?Math.round(pTotal/pCount):0;

  // Payment breakdown
  const payMap:Record<string,{count:number;total:number}> = {};
  periodOrders.forEach(o=>{const k=o.payment||'other';if(!payMap[k])payMap[k]={count:0,total:0};payMap[k].count++;payMap[k].total+=o.total||0;});

  // Top items
  const itemMap:Record<string,{qty:number;revenue:number}> = {};
  periodOrders.forEach(o=>(o.items||[]).forEach(it=>{if(!itemMap[it.name])itemMap[it.name]={qty:0,revenue:0};itemMap[it.name].qty+=it.qty||1;itemMap[it.name].revenue+=(it.subtotal||(it.price*(it.qty||1)));}));
  const topItems = Object.entries(itemMap).sort((a,b)=>b[1].qty-a[1].qty).slice(0,10);

  // Breakdown rows
  const breakdownRows = (() => {
    const now = new Date();
    if (salesTab==='today') {
      const hrs:Record<number,{o:number;n:number;d:number}> = {};
      for(let h=10;h<=23;h++) hrs[h]={o:0,n:0,d:0};
      periodOrders.forEach(o=>{const h=new Date(o.timestamp).getHours();if(hrs[h]){hrs[h].o++;hrs[h].n+=o.total||0;hrs[h].d+=o.discount||0;}});
      return Object.entries(hrs).filter(([,v])=>v.o>0).map(([h,v])=>({label:`${parseInt(h)>12?parseInt(h)-12:h}:00${parseInt(h)>=12?' PM':' AM'}`,orders:v.o,net:v.n,disc:v.d}));
    }
    if (salesTab==='week') {
      const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const map:Record<string,{o:number;n:number;d:number}> = {};
      for(let i=0;i<7;i++){const d=new Date(now);d.setDate(now.getDate()-now.getDay()+i);map[d.toDateString()]={o:0,n:0,d:0};}
      periodOrders.forEach(o=>{const k=new Date(o.timestamp).toDateString();if(map[k]){map[k].o++;map[k].n+=o.total||0;map[k].d+=o.discount||0;}});
      return Object.entries(map).map(([k,v])=>({label:`${days[new Date(k).getDay()]} ${new Date(k).getDate()}`,orders:v.o,net:v.n,disc:v.d}));
    }
    if (salesTab==='month') {
      const map:Record<string,{o:number;n:number;d:number}> = {};
      periodOrders.forEach(o=>{const d=new Date(o.timestamp);const k=`Week ${Math.ceil(d.getDate()/7)}`;if(!map[k])map[k]={o:0,n:0,d:0};map[k].o++;map[k].n+=o.total||0;map[k].d+=o.discount||0;});
      return Object.entries(map).map(([k,v])=>({label:k,orders:v.o,net:v.n,disc:v.d}));
    }
    const map:Record<string,{o:number;n:number;d:number}> = {};
    periodOrders.forEach(o=>{const d=new Date(o.timestamp);const k=d.toLocaleDateString('en-IN',{month:'short',year:'numeric'});if(!map[k])map[k]={o:0,n:0,d:0};map[k].o++;map[k].n+=o.total||0;map[k].d+=o.discount||0;});
    return Object.entries(map).map(([k,v])=>({label:k,orders:v.o,net:v.n,disc:v.d}));
  })();

  // ─── Fraud data ───────────────────────────────────────────────────────────
  const discountOrders  = orders.filter(o=>(o.discount||0)>0).sort((a,b)=>new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime());
  const cancelledOrders = orders.filter(o=>o.status==='cancelled').sort((a,b)=>new Date(b.timestamp).getTime()-new Date(a.timestamp).getTime());
  const cancelRate      = orders.length>0?Math.round((cancelledOrders.length/orders.length)*100):0;
  const highDiscOrders  = discountOrders.filter(o=>(o.discount||0)/((o.subtotal||o.total)||1)>0.3);
  const todayDiscTotal  = orders.filter(o=>new Date(o.timestamp).toDateString()===todayStr).reduce((s,o)=>s+(o.discount||0),0);
  const alerts:string[] = [];
  if (cancelRate>20) alerts.push(`⚠️ High cancellation rate: ${cancelRate}% of all orders cancelled`);
  if (highDiscOrders.length>0) alerts.push(`⚠️ ${highDiscOrders.length} order(s) had discount >30% of bill — review now`);
  if (todayDiscTotal>2000) alerts.push(`⚠️ Today's total discounts: ₹${todayDiscTotal} — above normal threshold`);

  // ─── Filtered orders for table ────────────────────────────────────────────
  // orders from getOrders() is already newest-first (API uses order('created_at', { ascending: false })).
  // Previously used .slice(-60).reverse() which grabbed the OLDEST 60 then flipped them — now fixed to
  // take the most-recent 60 directly with .slice(0, 60) (no reverse needed).
  const filteredOrders = (orderFilter==='all' ? orders : orders.filter(o=>o.status===orderFilter)).slice(0, 60);
  const menuItems      = menuFilter==='All' ? menu : menu.filter(m=>m.category===menuFilter);

  // ─── Nav button ───────────────────────────────────────────────────────────
  const NavBtn = ({id,label}:{id:Section;label:string}) => (
    <button onClick={()=>setSection(id)} style={{padding:'0.55rem 1.25rem',border:'none',background:section===id?'#E65C00':'transparent',color:section===id?'white':'#bbb',fontWeight:700,cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'0.83rem',borderRadius:6,transition:'all .2s',whiteSpace:'nowrap' as const}}>{label}</button>
  );

  // ── Admin PIN change — verified server-side via /api/auth/change-pin ───────
  async function changeAdminPin() {
    setAdminPinMsg('');
    if (!adminPinOld) { setAdminPinMsg('❌ Enter your current PIN'); return; }
    if (adminNewPin.length < 4) { setAdminPinMsg('❌ New PIN must be at least 4 digits'); return; }
    if (adminNewPin !== adminNewPin2) { setAdminPinMsg('❌ New PINs do not match'); return; }
    setAdminPinMsg('⏳ Updating…');
    try {
      const res    = await fetch('/api/auth/change-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentPin: adminPinOld, newPin: adminNewPin }),
      });
      const result = await res.json() as { ok: boolean; error?: string };
      if (!result.ok) {
        setAdminPinMsg(`❌ ${result.error ?? 'Failed to update PIN'}`);
        return;
      }
      setAdminPinMsg('✅ Admin PIN updated successfully!');
      setAdminPinOld(''); setAdminNewPin(''); setAdminNewPin2('');
      setTimeout(() => setAdminPinMsg(''), 4000);
    } catch (e) {
      setAdminPinMsg(`❌ ${e instanceof Error ? e.message : 'Failed to update PIN'}`);
    }
  }

  // ── Security question setup ───────────────────────────────────────────────
  async function saveSecurityQuestion() {
    setSecMsg('');
    if (!secQuestion) { setSecMsg('❌ Select a security question'); return; }
    if (!secAnswer.trim()) { setSecMsg('❌ Enter your answer'); return; }
    if (secAnswer.toLowerCase().trim() !== secAnswerConf.toLowerCase().trim()) {
      setSecMsg('❌ Answers do not match'); return;
    }
    try {
      await saveSettings({
        security_question: secQuestion,
        security_answer: secAnswer.toLowerCase().trim(),
        security_setup_at: new Date().toISOString(),
      });
      setSecSetup({ question: secQuestion, setupAt: new Date().toISOString() });
      setSecMsg('✅ Security question saved! You can now recover your PIN if forgotten.');
      setSecQuestion(''); setSecAnswer(''); setSecAnswerConf('');
      setTimeout(() => setSecMsg(''), 5000);
    } catch (e) {
      setSecMsg(`❌ ${e instanceof Error ? e.message : 'Failed to save security question'}`);
    }
  }

  // ── Table management actions ──────────────────────────────────────────────
  async function handleAddTable() {
    const name = tableForm.name.trim();
    if (!name) { setTableMsg('❌ Table name is required'); return; }
    const capacity = parseInt(tableForm.capacity) || 4;
    if (capacity < 1 || capacity > 50) { setTableMsg('❌ Capacity must be between 1 and 50'); return; }
    try {
      await createTableApi(name, capacity);
      setTableMsg(`✅ Table "${name}" added`);
      setTableForm({ name: '', capacity: '4' });
      await refresh();
      setTimeout(() => setTableMsg(''), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setTableMsg(`❌ ${msg}`);
    }
  }

  async function handleSaveTableEdit(id: string) {
    const name = editTableVal.name.trim();
    if (!name) { setTableMsg('❌ Table name is required'); return; }
    const capacity = parseInt(editTableVal.capacity) || 4;
    try {
      await updateTableApi(id, { name, capacity });
      setTableMsg(`✅ Table updated`);
      setEditTableId('');
      await refresh();
      setTimeout(() => setTableMsg(''), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setTableMsg(`❌ ${msg}`);
    }
  }

  async function handleDeleteTable(id: string, name: string) {
    if (!window.confirm(`Delete table "${name}"? This cannot be undone.`)) return;
    try {
      await deleteTableApi(id);
      setTableMsg(`✅ Table "${name}" deleted`);
      await refresh();
      setTimeout(() => setTableMsg(''), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setTableMsg(`❌ ${msg}`);
    }
  }

  // Force-close a stale or ghost session from the admin panel.
  // Uses force=true to bypass the re_serve_required billing guard.
  async function handleForceCloseSession(tableId: string, tabId: string, tableName: string) {
    if (!window.confirm(
      `Force-close the session on "${tableName}"?\n\n` +
      `This is an admin override for stale or abandoned sessions.\n` +
      `The tab will be closed with payment method "admin_override".`,
    )) return;
    try {
      setTableMsg(`⏳ Force-closing session on ${tableName}…`);
      await forceCloseTab(tabId, tableId);
      setTableMsg(`✅ Session on "${tableName}" force-closed`);
      await refresh();
      setTimeout(() => setTableMsg(''), 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setTableMsg(`❌ Force-close failed: ${msg}`);
    }
  }

  // ── Staff management actions ─────────────────────────────────────────────
  async function addStaffAccount() {
    if (!staffForm.name.trim() || !staffForm.username.trim() || !staffForm.pin.trim()) {
      setStaffMsg('❌ All fields required'); return;
    }
    try {
      await addStaff({ name: staffForm.name, username: staffForm.username, pin: staffForm.pin, role: 'waiter' });
      setStaffMsg(`✅ Account created for ${staffForm.name}`);
      setStaffForm({ name: '', username: '', pin: '' });
      void refresh();
    } catch (e) {
      setStaffMsg(`❌ ${e instanceof Error ? e.message : 'Failed to create account'}`);
    }
  }

  async function addDeliveryAccount() {
    if (!deliveryForm.name.trim() || !deliveryForm.username.trim() || !deliveryForm.pin.trim()) {
      setDeliveryMsg('❌ All fields required'); return;
    }
    try {
      await addStaff({ name: deliveryForm.name, username: deliveryForm.username, pin: deliveryForm.pin, role: 'delivery' });
      setDeliveryMsg(`✅ Account created for ${deliveryForm.name}`);
      setDeliveryForm({ name: '', username: '', pin: '' });
      void refresh();
    } catch (e) {
      setDeliveryMsg(`❌ ${e instanceof Error ? e.message : 'Failed to create account'}`);
    }
  }

  async function saveKitchenPinFn() {
    if (kitchenPin.length < 4) { setKitchenPinMsg('❌ PIN must be 4+ digits'); return; }
    try {
      await saveSetting('kitchen_pin', kitchenPin);
      setKitchenPinMsg('✅ Kitchen PIN updated');
      setTimeout(() => setKitchenPinMsg(''), 3000);
    } catch (e) {
      setKitchenPinMsg(`❌ ${e instanceof Error ? e.message : 'Failed to update PIN'}`);
    }
  }

  async function saveManagerPinFn() {
    if (managerPin.length < 4) { setManagerPinMsg('❌ PIN must be 4+ digits'); return; }
    try {
      await saveSetting('manager_pin', managerPin);
      setManagerPinMsg('✅ Manager PIN updated');
      setTimeout(() => setManagerPinMsg(''), 3000);
    } catch (e) {
      setManagerPinMsg(`❌ ${e instanceof Error ? e.message : 'Failed to update PIN'}`);
    }
  }

  // ─────────────────────────────── RENDER ────────────────────────────────────
  if (!authChecked) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#faf8f3,#f5f0e8)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center', color:'#888' }}>
          <div style={{ fontSize:'2rem', marginBottom:'0.5rem' }}>📊</div>
          <div>Loading Admin Dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#faf8f3,#f5f0e8)',fontFamily:'Poppins,sans-serif'}}>

      {/* Header */}
      <div style={{background:'linear-gradient(135deg,#1A0800,#2D0F00)',color:'white',padding:'0.9rem 1.75rem',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:200,boxShadow:'0 4px 16px rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
          <span style={{fontSize:'1.5rem'}}>📊</span>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:'1.15rem',fontWeight:900}}>Admin Dashboard</div>
            <div style={{fontSize:'0.7rem',color:'#F9A826'}}>Foodie Lover — Owner Control Panel</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
          {alerts.length>0 && <div style={{background:'#ef4444',color:'white',padding:'0.25rem 0.75rem',borderRadius:20,fontSize:'0.75rem',fontWeight:700,cursor:'pointer'}} onClick={()=>setSection('fraud')}>🚨 {alerts.length} Alert{alerts.length>1?'s':''}</div>}
          <button onClick={()=>setSection('staff')} style={{...btn('#374151'),padding:'0.3rem 0.7rem',fontSize:'0.75rem'}}>🔐 PIN & Staff</button>
          <button onClick={adminLogout} style={{...btn('#7f1d1d'),padding:'0.3rem 0.7rem',fontSize:'0.75rem'}}>🚪 Logout</button>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:700,fontSize:'0.85rem'}}>{clock.date}</div>
            <div style={{fontSize:'0.78rem',color:'#F9A826'}}>{clock.time}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{background:'#1A0800',display:'flex',gap:'0.2rem',padding:'0.35rem 1.5rem',overflowX:'auto'}}>
        <NavBtn id="overview" label="📋 Overview"         />
        <NavBtn id="orders"   label="🧾 Orders"           />
        <NavBtn id="sales"    label="📊 Sales Report"     />
        <NavBtn id="menu"     label="🍽️ Menu Management" />
        <NavBtn id="tables"   label="🪑 Tables"           />
        <NavBtn id="fraud"    label="🔍 Transparency"     />
        <NavBtn id="staff"    label="👥 Staff"            />
      </div>

      <div style={{maxWidth:'1400px',margin:'0 auto',padding:'1.5rem'}}>

        {/* ═══════════ OVERVIEW ═══════════ */}
        {section==='overview' && <>
          {/* Dine-in stats */}
          <div style={{fontSize:'0.7rem',fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:1,marginBottom:'0.5rem'}}>🍽️ Dine-In &amp; General</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(165px,1fr))',gap:'1rem',marginBottom:'1.25rem'}}>
            {[
              {icon:'📋',val:todayOrders.length,   label:"Today's Orders",   color:'#E65C00'},
              {icon:'💰',val:`₹${todayRevenue}`,    label:'Net Revenue',      color:'#E65C00'},
              {icon:'🏷️',val:`₹${todayDiscount}`,  label:'Discounts Given',  color:'#16a34a'},
              {icon:'❌',val:todayCancel.length,    label:'Cancelled Today',  color:'#ef4444'},
              {icon:'🪑',val:activeTables,          label:'Active Tables',    color:'#3b82f6'},
              {icon:'⏳',val:pendingCount,          label:'Awaiting / Queued',color:'#f59e0b'},
            ].map(s=>(
              <div key={s.label} style={{background:'white',padding:'1.1rem',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.08)',borderLeft:`4px solid ${s.color}`}}>
                <div style={{fontSize:'1.5rem',marginBottom:'0.25rem'}}>{s.icon}</div>
                <div style={{fontSize:'1.4rem',fontWeight:900,color:s.color}}>{s.val}</div>
                <div style={{color:'#888',fontSize:'0.76rem'}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Online order stats */}
          <div style={{fontSize:'0.7rem',fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:1,marginBottom:'0.5rem'}}>📦 Online Orders (Today)</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(165px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
            {[
              {icon:'📦',val:onlineStats?.todayTotal    ?? 0, label:'Online Orders Today', color:'#2563eb'},
              {icon:'🏪',val:onlineStats?.todayPickup   ?? 0, label:'Pickup Orders',       color:'#0891b2'},
              {icon:'🚗',val:onlineStats?.todayDelivery ?? 0, label:'Delivery Orders',     color:'#7c3aed'},
              {icon:'💵',val:`₹${onlineStats?.todayRevenue ?? 0}`, label:'Online Revenue', color:'#16a34a'},
              {icon:'⏳',val:onlineStats?.pendingOnline ?? 0, label:'Pending Online',      color:'#f59e0b'},
            ].map(s=>(
              <div key={s.label} style={{background:'white',padding:'1.1rem',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.08)',borderLeft:`4px solid ${s.color}`}}>
                <div style={{fontSize:'1.5rem',marginBottom:'0.25rem'}}>{s.icon}</div>
                <div style={{fontSize:'1.4rem',fontWeight:900,color:s.color}}>{s.val}</div>
                <div style={{color:'#888',fontSize:'0.76rem'}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Issue analytics */}
          <div style={{fontSize:'0.7rem',fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:1,marginBottom:'0.5rem'}}>🚨 Order Issues (Today)</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(165px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
            {[
              {icon:'🚨', val: issueTotal,    label:'Issues Reported',   color:'#dc2626'},
              {icon:'🔓', val: issueOpen,     label:'Unresolved Now',     color:'#f97316'},
              {icon:'⬆️', val: issueEscalated,label:'Escalated',          color:'#7f1d1d'},
              {icon:'✅', val: issueResolved, label:'Resolved Today',     color:'#16a34a'},
              {icon:'📊', val:`${issueRate}%`,label:'Issue Rate',          color:'#8b5cf6'},
            ].map(s=>(
              <div key={s.label} style={{background:'white',padding:'1.1rem',borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.08)',borderLeft:`4px solid ${s.color}`}}>
                <div style={{fontSize:'1.5rem',marginBottom:'0.25rem'}}>{s.icon}</div>
                <div style={{fontSize:'1.4rem',fontWeight:900,color:s.color}}>{s.val}</div>
                <div style={{color:'#888',fontSize:'0.76rem'}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Active issues detail — only when issues exist */}
          {issueOpen > 0 && (
            <div style={{...card('#dc2626'), marginBottom:'1.5rem'}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700,marginBottom:'0.85rem',color:'#1A0800'}}>🚨 Active Issues Requiring Attention</h2>
              <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                {todayIssues.filter(i => ['open','reserving','escalated'].includes(i.status)).map(issue => {
                  const relOrd = orders.find(o => o.id === issue.orderId);
                  return (
                    <div key={issue.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.6rem 0.85rem',background:issue.escalated ? '#fef2f2' : '#fff7ed',borderRadius:8,border:`1px solid ${issue.escalated ? '#fecaca' : '#fed7aa'}`,flexWrap:'wrap',gap:'0.5rem'}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:'0.82rem',color:'#1A0800'}}>
                          Order #{relOrd?.orderNum || issue.orderId.slice(-6)}
                          {relOrd?.customerName && <span style={{fontWeight:400,color:'#888',marginLeft:'0.3rem'}}>— {relOrd.customerName}</span>}
                          {issue.escalated && <span style={{marginLeft:'0.5rem',background:'#dc2626',color:'white',borderRadius:4,padding:'0.05rem 0.35rem',fontSize:'0.65rem',fontWeight:800}}>ESCALATED</span>}
                        </div>
                        <div style={{fontSize:'0.7rem',color:'#64748b',marginTop:'0.1rem'}}>
                          Reported by: {issue.reportedBy} · Attempt #{issue.retryCount} · Status: {issue.status} · {new Date(issue.reportedAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <span style={{fontSize:'0.72rem',fontWeight:700,padding:'0.2rem 0.55rem',borderRadius:20,background: issue.status === 'reserving' ? '#dbeafe' : issue.escalated ? '#fee2e2' : '#fff7ed',color: issue.status === 'reserving' ? '#1d4ed8' : issue.escalated ? '#dc2626' : '#c2410c'}}>
                        {issue.status === 'reserving' ? '🔄 Re-serving' : issue.escalated ? '🚨 Escalated' : '⏳ Open'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table map — live status from Supabase customer_tabs */}
          <div style={card()}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700,marginBottom:'0.9rem',color:'#1A0800'}}>🪑 Table Overview</h2>
            {liveTables.length === 0 && (
              <div style={{fontSize:'0.8rem',color:'#888',textAlign:'center',padding:'1rem'}}>Loading tables…</div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(75px,1fr))',gap:'0.5rem'}}>
              {liveTables.map(t=>{
                const sessionMins = t.sessionStart
                  ? Math.floor((Date.now()-new Date(t.sessionStart).getTime())/60000)
                  : null;
                // Sessions > 4 hours are flagged as stale (likely forgotten / abandoned)
                const STALE_MINS = 240;
                const isStale   = sessionMins !== null && sessionMins >= STALE_MINS;
                const color =
                  t.status === 'available' ? '#10b981' :
                  isStale                  ? '#dc2626' :  // stale → red
                                             '#f97316';   // normal occupied → orange
                const bg =
                  t.status === 'available' ? '#d1fae5' :
                  isStale                  ? '#fee2e2' :  // stale → light red
                                             '#fed7aa';   // normal occupied → light orange
                // Format duration: "23m", "1h 5m", "17h 8m"
                const fmtDuration = (m: number) =>
                  m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`;
                return (
                  <div key={t.id} style={{background:bg,border:`2px solid ${color}`,borderRadius:8,padding:'0.55rem',textAlign:'center'}}>
                    <div style={{fontWeight:800,fontSize:'0.88rem',color:'#1A0800'}}>{t.name}</div>
                    <div style={{fontSize:'0.58rem',color:t.status==='available'?'#065f46':color,fontWeight:700,textTransform:'uppercase'}}>
                      {isStale ? '⚠️ STALE' : t.status}
                    </div>
                    {sessionMins!==null&&t.status==='occupied'&&(
                      <div style={{fontSize:'0.56rem',color:isStale?'#dc2626':'#E65C00',fontWeight:700}}>
                        {fmtDuration(sessionMins)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Stale session legend */}
            {liveTables.some(t => {
              const m = t.sessionStart ? Math.floor((Date.now()-new Date(t.sessionStart).getTime())/60000) : 0;
              return m >= 240 && t.status === 'occupied';
            }) && (
              <div style={{marginTop:'0.6rem',fontSize:'0.68rem',color:'#dc2626',fontWeight:600,textAlign:'center'}}>
                ⚠️ Red = session open &gt;4h — go to Tables tab to force-close
              </div>
            )}
          </div>

          {/* End of Day Report — derived from live Supabase orders */}
          {(() => {
            const todayOrdsFull = orders.filter(o => new Date(o.timestamp).toDateString() === todayStr);
            const eod = {
              totalOrders:   todayOrdsFull.filter(o => o.status === 'completed').length,
              totalRevenue:  Math.round(todayOrdsFull.filter(o => !['cancelled','void'].includes(o.status)).reduce((s,o)=>s+(o.total||0),0)),
              avgOrderValue: (() => {
                const done = todayOrdsFull.filter(o => o.status === 'completed');
                return done.length > 0 ? Math.round(done.reduce((s,o)=>s+(o.total||0),0)/done.length) : 0;
              })(),
              completedTabs: closedTabsCount, // fetched in refresh() via getTabsApi('closed', today)
              discountsTotal:Math.round(todayOrdsFull.reduce((s,o)=>s+(o.discount||0),0)),
              voidedOrders:  todayOrdsFull.filter(o => o.status === 'void').length,
              topItems: (() => {
                const map: Record<string,{name:string;qty:number}> = {};
                todayOrdsFull.filter(o=>!['cancelled','void'].includes(o.status))
                  .forEach(o=>(o.items||[]).forEach(it=>{if(!map[it.name])map[it.name]={name:it.name,qty:0};map[it.name].qty+=it.qty||1;}));
                return Object.values(map).sort((a,b)=>b.qty-a.qty).slice(0,5);
              })(),
            };
            return (
              <div style={card('#16a34a')}>
                <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700,marginBottom:'0.85rem',color:'#1A0800'}}>📊 End-of-Day Report — Today</h2>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:'0.7rem',marginBottom:'0.75rem'}}>
                  {[
                    {icon:'🧾',val:eod.totalOrders,label:'Orders Completed',color:'#16a34a'},
                    {icon:'💰',val:`₹${eod.totalRevenue}`,label:'Total Revenue',color:'#E65C00'},
                    {icon:'📊',val:`₹${eod.avgOrderValue}`,label:'Avg Order Value',color:'#8b5cf6'},
                    {icon:'✅',val:eod.completedTabs,label:'Closed Tabs',color:'#3b82f6'},
                    {icon:'🏷️',val:`₹${eod.discountsTotal}`,label:'Discounts',color:'#f59e0b'},
                    {icon:'🚫',val:eod.voidedOrders,label:'Voided Orders',color:'#ef4444'},
                  ].map(s=>(
                    <div key={s.label} style={{background:'white',border:`1px solid ${s.color}30`,borderRadius:10,padding:'0.75rem',textAlign:'center',borderLeft:`3px solid ${s.color}`}}>
                      <div style={{fontSize:'1.1rem',marginBottom:'0.15rem'}}>{s.icon}</div>
                      <div style={{fontSize:'1.1rem',fontWeight:900,color:s.color}}>{s.val}</div>
                      <div style={{fontSize:'0.62rem',color:'#999'}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {eod.topItems.length>0 && (
                  <div>
                    <div style={{fontSize:'0.78rem',fontWeight:700,color:'#16a34a',marginBottom:'0.35rem'}}>🏆 Today&apos;s Top Items</div>
                    <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                      {eod.topItems.map((item,i)=>(
                        <div key={i} style={{background:'#f0fdf4',borderRadius:20,padding:'0.2rem 0.7rem',fontSize:'0.75rem',color:'#064e3b',fontWeight:600}}>
                          {item.name} <span style={{color:'#E65C00',fontWeight:700}}>×{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Table Occupancy Analytics */}
          {tableOccupancy.length > 0 && (
            <div style={card('#3b82f6')}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>🪑 Table Occupancy Analytics</h2>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                  <thead><tr style={{background:'#eff6ff'}}>
                    {['Table','Sessions','Avg Time','Revenue','Last Used'].map(h=>(
                      <th key={h} style={{padding:'0.48rem 0.75rem',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:'#1d4ed8',textTransform:'uppercase'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {tableOccupancy.slice(0,10).map((t,i)=>(
                      <tr key={t.tableId} style={{borderBottom:'1px solid #dbeafe',background:i%2?'#f0f9ff':'white'}}>
                        <td style={{padding:'0.48rem 0.75rem',fontWeight:700,color:'#1A0800'}}>{t.tableId}</td>
                        <td style={{padding:'0.48rem 0.75rem',fontWeight:700,color:'#3b82f6'}}>{t.totalSessions}</td>
                        <td style={{padding:'0.48rem 0.75rem'}}>{t.avgMinutes} min</td>
                        <td style={{padding:'0.48rem 0.75rem',fontWeight:700,color:'#16a34a'}}>₹{t.totalRevenue}</td>
                        <td style={{padding:'0.48rem 0.75rem',color:'#888',fontSize:'0.75rem'}}>{t.lastUsed?new Date(t.lastUsed).toLocaleDateString('en-IN'):'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Staff links */}
          <div style={card()}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700,marginBottom:'0.85rem',color:'#1A0800'}}>👥 Staff Pages</h2>
            <div style={{display:'flex',gap:'0.65rem',flexWrap:'wrap'}}>
              {[
                {href:'/kitchen',      label:'🔥 Kitchen',         color:'linear-gradient(135deg,#E65C00,#F9A826)'},
                {href:'/waiter',       label:'🧑‍🍳 Waiter',          color:'linear-gradient(135deg,#E65C00,#F9A826)'},
                {href:'/manager',      label:'💳 Manager Counter',  color:'linear-gradient(135deg,#064e3b,#16a34a)'},
                {href:'/table?table=T01',label:'📱 Table Ordering', color:'linear-gradient(135deg,#E65C00,#F9A826)'},
                {href:'/',             label:'🛍️ Customer Menu',   color:'linear-gradient(135deg,#E65C00,#F9A826)'},
                {href:'/qr',           label:'📱 QR Generator',     color:'linear-gradient(135deg,#3b82f6,#1d4ed8)'},
              ].map(l=>(
                <a key={l.href} href={l.href} style={{padding:'0.55rem 1.1rem',background:l.color,color:'white',borderRadius:8,fontWeight:700,textDecoration:'none',fontSize:'0.84rem'}}>{l.label}</a>
              ))}
            </div>
          </div>
        </>}

        {/* ═══════════ ORDERS ═══════════ */}
        {section==='orders' && (
          <div style={card()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:'0.5rem'}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700,color:'#1A0800',margin:0}}>🧾 All Orders</h2>
              <div style={{display:'flex',gap:'0.35rem',flexWrap:'wrap'}}>
                {[
                  {k:'all',            l:'All'},
                  {k:'awaiting_waiter',l:'Awaiting Waiter'},
                  {k:'pending',        l:'In Queue'},
                  {k:'preparing',      l:'Preparing'},
                  {k:'prepared',       l:'Ready'},
                  {k:'served',         l:'Served'},
                  {k:'out_for_delivery',l:'Out for Delivery'},
                  {k:'delivered',      l:'Delivered'},
                  {k:'re_serve_required',l:'Re-Serve'},
                  {k:'completed',      l:'Completed'},
                  {k:'cancelled',      l:'Cancelled'},
                  {k:'void',           l:'Void'},
                ].map(({k,l})=>(
                  <button key={k} onClick={()=>setOrderFilter(k)} style={{...tabB(orderFilter===k),padding:'0.28rem 0.7rem',fontSize:'0.72rem'}}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.81rem'}}>
                <thead><tr style={{background:'#FFF5EB'}}>
                  {['Order ID','Type','Location','Customer','Items','Subtotal','Disc.','Total','Payment','Status','Time','Actions'].map(h=>(
                    <th key={h} style={{padding:'0.5rem 0.65rem',textAlign:'left',fontWeight:700,fontSize:'0.7rem',color:'#6B5246',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {!filteredOrders.length
                    ? <tr><td colSpan={12} style={{textAlign:'center',color:'#999',padding:'2rem'}}>No orders</td></tr>
                    : filteredOrders.map(order=>{
                        const t      = new Date(order.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
                        // Each order type has its own status flow — must NOT share delivery/pickup flows.
                        // Pickup: pending→preparing→prepared→served→completed  (NOT out_for_delivery)
                        // Delivery: pending→preparing→prepared→out_for_delivery→delivered→completed
                        const _flow  = order.type==='delivery' ? STATUS_FLOW_DELIVERY
                                     : order.type==='pickup'   ? STATUS_FLOW_PICKUP
                                     : STATUS_FLOW_DINE_IN;
                        const curIdx = (_flow as readonly string[]).indexOf(order.status);
                        const nxt    = curIdx !== -1 && curIdx < _flow.length - 1 ? _flow[curIdx + 1] : undefined;
                        const isc    = order.status==='cancelled';
                        return (
                          <tr key={order.id} style={{borderBottom:'1px solid #f5f0e8',opacity:isc?0.6:1}}>
                            <td style={{padding:'0.5rem 0.65rem'}}><button onClick={()=>setSelOrder(order)} style={{background:'none',border:'none',color:'#E65C00',textDecoration:'underline',fontWeight:700,cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'0.81rem'}}>{order.id}</button></td>
                            <td style={{padding:'0.5rem 0.65rem'}}>
                              <span style={{fontSize:'0.7rem',fontWeight:700,padding:'0.12rem 0.45rem',borderRadius:10,background:order.type==='dine-in'?'#fff7ed':order.type==='delivery'?'#f5f3ff':'#f0fdf4',color:order.type==='dine-in'?'#ea580c':order.type==='delivery'?'#7c3aed':'#16a34a'}}>
                                {order.type==='dine-in'?'🍽️ Dine-In':order.type==='delivery'?'🚗 Delivery':'🏪 Pickup'}
                              </span>
                              {order.source==='online' && <span style={{marginLeft:'0.25rem',fontSize:'0.62rem',fontWeight:700,background:'#dbeafe',color:'#1d4ed8',padding:'0.1rem 0.35rem',borderRadius:6}}>ONLINE</span>}
                            </td>
                            <td style={{padding:'0.5rem 0.65rem',fontSize:'0.8rem'}}>
                              {order.type==='dine-in'?`Table ${order.tableId}`:order.deliveryAddress?<span title={order.deliveryAddress}>📍 {order.deliveryAddress.slice(0,22)}{order.deliveryAddress.length>22?'…':''}</span>:'—'}
                            </td>
                            <td style={{padding:'0.5rem 0.65rem',fontWeight:600}}>{order.customerName}</td>
                            <td style={{padding:'0.5rem 0.65rem',textAlign:'center'}}>{(order.items||[]).reduce((s:number,it:{qty?:number})=>s+(it.qty||1),0)||0}</td>
                            <td style={{padding:'0.5rem 0.65rem'}}>₹{order.subtotal||order.total}</td>
                            <td style={{padding:'0.5rem 0.65rem',color:'#16a34a',fontWeight:700}}>{(order.discount||0)>0?`-₹${order.discount}`:'—'}</td>
                            <td style={{padding:'0.5rem 0.65rem',fontWeight:800}}>₹{order.total}</td>
                            <td style={{padding:'0.5rem 0.65rem',color:'#888'}}>{order.payment||'N/A'}</td>
                            <td style={{padding:'0.5rem 0.65rem'}}><span style={{fontSize:'0.7rem',fontWeight:700,padding:'0.12rem 0.45rem',borderRadius:10,background:(STATUS_COLOR[order.status]||'#888')+'22',color:STATUS_COLOR[order.status]||'#888',textTransform:'capitalize'}}>{order.status}</span></td>
                            <td style={{padding:'0.5rem 0.65rem',color:'#999',whiteSpace:'nowrap'}}>{t}</td>
                            <td style={{padding:'0.5rem 0.65rem',whiteSpace:'nowrap',display:'flex',gap:'0.25rem'}}>
                              {!isc&&nxt&&<button onClick={()=>advance(order.id)} style={{...btn('#f97316'),padding:'0.18rem 0.5rem',fontSize:'0.7rem'}}>▶ {STATUS_LABEL_MAP[nxt]||nxt}</button>}
                              {!isc&&order.status!=='completed'&&<button onClick={()=>{setCancelModal({open:true,orderId:order.id});setCancelReason('');}} style={{...btn('#ef4444'),padding:'0.18rem 0.45rem',fontSize:'0.7rem'}}>✕</button>}
                              {!isc&&<button onClick={()=>{setDiscountModal({open:true,orderId:order.id});setDiscAmt('');setDiscNote('');setPinInput('');setPinMsg('');}} style={{...btn('#8b5cf6'),padding:'0.18rem 0.45rem',fontSize:'0.7rem'}}>🏷</button>}
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════ SALES ═══════════ */}
        {section==='sales' && <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:'0.75rem'}}>
            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
              {(['today','week','month','all'] as const).map(t=>(
                <button key={t} onClick={()=>setSalesTab(t)} style={tabB(salesTab===t)}>
                  {t==='today'?'📅 Today':t==='week'?'📆 This Week':t==='month'?'🗓️ This Month':'📊 All Time'}
                </button>
              ))}
            </div>
            <button onClick={()=>{
              // Export current period orders from live Supabase data as CSV
              const rows = periodOrders.map(o=>[
                o.id,o.orderNum||'',o.type,o.customerName,o.status,
                o.total||0,o.discount||0,o.paymentMethod||'',
                new Date(o.timestamp).toLocaleString('en-IN'),
              ]);
              const header=['ID','Order#','Type','Customer','Status','Total','Discount','Payment','Date'];
              const csv=[header,...rows].map(r=>r.map(v=>JSON.stringify(v??'')).join(',')).join('\n');
              const blob=new Blob([csv],{type:'text/csv'});
              const url=URL.createObjectURL(blob);
              const a=document.createElement('a');
              a.href=url;a.download=`orders-${salesTab}-${new Date().toISOString().slice(0,10)}.csv`;
              a.click();URL.revokeObjectURL(url);
            }} style={{...btn('#16a34a'),display:'flex',alignItems:'center',gap:'0.4rem'}}>📁 Export CSV</button>
          </div>

          {/* Summary cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'0.7rem',marginBottom:'1.4rem'}}>
            {[{val:pCount,label:'Orders',color:'#3b82f6'},{val:`₹${pGross}`,label:'Gross Rev.',color:'#E65C00'},{val:`₹${pDisc}`,label:'Discounts',color:'#ef4444'},{val:`₹${pTotal}`,label:'Net Revenue',color:'#16a34a'},{val:`₹${pAvg}`,label:'Avg Order',color:'#8b5cf6'},{val:periodOrders.filter(o=>o.type==='dine-in').length,label:'🍽️ Dine-In',color:'#f97316'},{val:periodOrders.filter(o=>o.type==='pickup').length,label:'🏪 Pickup',color:'#06b6d4'},{val:periodOrders.filter(o=>o.type==='delivery').length,label:'🚗 Delivery',color:'#7c3aed'},{val:periodOrders.filter(o=>o.source==='online').length,label:'📦 Online',color:'#2563eb'}].map(c=>(
              <div key={c.label} style={{background:'white',border:'1px solid #f0e4d7',borderRadius:10,padding:'0.8rem',borderLeft:`4px solid ${c.color}`}}>
                <div style={{fontSize:'1.2rem',fontWeight:900,color:c.color}}>{c.val}</div>
                <div style={{fontSize:'0.7rem',color:'#999'}}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Payment breakdown */}
          <div style={card()}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'0.98rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>💳 Payment Method Breakdown</h3>
            <div style={{display:'flex',gap:'0.7rem',flexWrap:'wrap'}}>
              {!Object.keys(payMap).length
                ? <div style={{color:'#999',fontSize:'0.85rem'}}>No data for this period</div>
                : Object.entries(payMap).map(([method,data])=>(
                  <div key={method} style={{background:'#FFF5EB',border:'1px solid #f0e4d7',borderRadius:8,padding:'0.7rem 1rem',minWidth:'130px'}}>
                    <div style={{fontWeight:800,fontSize:'0.98rem',color:'#E65C00'}}>₹{data.total}</div>
                    <div style={{fontSize:'0.72rem',color:'#888',textTransform:'capitalize'}}>{method} ({data.count} orders)</div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Breakdown table */}
          <div style={card()}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'0.98rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>
              {salesTab==='today'?'⏰ Hour-by-Hour':salesTab==='week'?'📅 Day-by-Day':salesTab==='month'?'📆 Week-by-Week':'🗓️ Month-by-Month'} Breakdown
            </h3>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.83rem'}}>
                <thead><tr style={{background:'linear-gradient(135deg,#E65C00,#F9A826)',color:'white'}}>
                  {['Period','Orders','Net Revenue','Discounts'].map(h=><th key={h} style={{padding:'0.55rem 0.8rem',textAlign:'left',fontSize:'0.76rem',fontWeight:700}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {!breakdownRows.length
                    ? <tr><td colSpan={4} style={{textAlign:'center',color:'#999',padding:'1.5rem'}}>No data</td></tr>
                    : breakdownRows.map((r,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid #f5f0e8',background:i%2?'#fffaf5':'white'}}>
                          <td style={{padding:'0.5rem 0.8rem',fontWeight:600}}>{r.label}</td>
                          <td style={{padding:'0.5rem 0.8rem'}}>{r.orders}</td>
                          <td style={{padding:'0.5rem 0.8rem',fontWeight:700,color:'#16a34a'}}>₹{r.net}</td>
                          <td style={{padding:'0.5rem 0.8rem',color:'#ef4444'}}>{r.disc>0?`-₹${r.disc}`:'—'}</td>
                        </tr>
                      ))
                  }
                </tbody>
                <tfoot><tr style={{background:'#f5f0e8',fontWeight:800}}>
                  <td style={{padding:'0.55rem 0.8rem',borderTop:'2px solid #E65C00'}}>TOTAL</td>
                  <td style={{padding:'0.55rem 0.8rem',borderTop:'2px solid #E65C00'}}>{pCount}</td>
                  <td style={{padding:'0.55rem 0.8rem',borderTop:'2px solid #E65C00',color:'#16a34a'}}>₹{pTotal}</td>
                  <td style={{padding:'0.55rem 0.8rem',borderTop:'2px solid #E65C00',color:'#ef4444'}}>{pDisc>0?`-₹${pDisc}`:'—'}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>

          {/* Top items */}
          {topItems.length>0 && (
            <div style={card()}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'0.98rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>🏆 Top Selling Items</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))',gap:'0.55rem'}}>
                {topItems.map(([name,data],i)=>(
                  <div key={name} style={{background:'#fafafa',border:'1px solid #f0f0f0',borderRadius:8,padding:'0.65rem 0.85rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:'0.65rem',color:'#f97316',fontWeight:700}}>#{i+1}</div>
                      <div style={{fontWeight:600,fontSize:'0.8rem',color:'#333'}}>{name}</div>
                      <div style={{fontSize:'0.68rem',color:'#999'}}>₹{data.revenue}</div>
                    </div>
                    <div style={{fontWeight:900,fontSize:'1.05rem',color:'#E65C00',textAlign:'right'}}>{data.qty}<div style={{fontSize:'0.62rem',color:'#bbb',fontWeight:400}}>sold</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>}

        {/* ═══════════ MENU ═══════════ */}
        {section==='menu' && <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:'0.75rem'}}>
            <div style={{display:'flex',gap:'0.35rem',flexWrap:'wrap'}}>
              {['All',...CATEGORIES].map(c=>(
                <button key={c} onClick={()=>setMenuFilter(c)} style={tabB(menuFilter===c)}>{c}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap' as const}}>
              <button onClick={importMenuCatalog} disabled={seedingMenu} style={{...btn('#8b5cf6'),fontSize:'0.78rem'}}>{seedingMenu?'⏳ Loading…':'📥 Import Catalog'}</button>
              <label style={{...btn('#16a34a'),fontSize:'0.78rem',cursor:'pointer' as const,display:'inline-flex',alignItems:'center' as const}}>
                📤 Import CSV
                <input type="file" accept=".csv" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f){void importMenuFromCsv(f);e.target.value='';}}} />
              </label>
              <button onClick={downloadCsvTemplate} style={{...btn('#6b7280'),fontSize:'0.78rem'}}>⬇️ CSV Template</button>
              <button onClick={()=>{setMenuModal({open:true,item:emptyItem(),isEdit:false});setModalVariants([{name:'',price:''}]);}} style={{...btn(),display:'flex',alignItems:'center',gap:'0.35rem'}}><span style={{fontSize:'1.1rem',lineHeight:1}}>＋</span> Add Item</button>
            </div>
          </div>

          {(seedMsg||csvImportMsg) && (() => {
            const message  = seedMsg || csvImportMsg;
            const bgColor  = message.startsWith('✅') ? '#dcfce7' : message.startsWith('⏳') ? '#eff6ff' : '#fef2f2';
            const txtColor = message.startsWith('✅') ? '#16a34a' : message.startsWith('⏳') ? '#2563eb' : '#ef4444';
            return (
              <div style={{padding:'0.6rem 0.85rem',borderRadius:8,background:bgColor,color:txtColor,fontWeight:700,fontSize:'0.82rem',marginBottom:'0.75rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span>{message}</span>
                <button onClick={()=>{setSeedMsg('');setCsvImportMsg('');}} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontSize:'1.1rem',lineHeight:1,padding:'0 0.2rem'}}>×</button>
              </div>
            );
          })()}
          {!menuItems.length
            ? <div style={{textAlign:'center',color:'#999',padding:'3rem',background:'white',borderRadius:12}}>No items in this category</div>
            : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(255px,1fr))',gap:'1rem'}}>
                {menuItems.map(item=>(
                  <div key={item.id} style={{background:'white',borderRadius:12,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',opacity:item.available===false?0.55:1,transition:'opacity .2s'}}>
                    <div style={{position:'relative',height:'145px',background:'#f5f0e8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.5rem'}}>
                      {item.img && <img src={item.img} alt={item.name} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />}
                      {!item.img && '🍽️'}
                      {item.badge && <span style={{position:'absolute',top:8,left:8,background:'#E65C00',color:'white',fontSize:'0.6rem',padding:'0.18rem 0.45rem',borderRadius:8,fontWeight:700,zIndex:1}}>{BADGE_LABEL[item.badge]||item.badge}</span>}
                      {item.available===false && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:'0.82rem',zIndex:1}}>UNAVAILABLE</div>}
                    </div>
                    <div style={{padding:'0.85rem'}}>
                      <div style={{fontSize:'0.62rem',color:'#888',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>{item.category}</div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'0.4rem',margin:'0.2rem 0 0.25rem'}}>
                        <div style={{fontWeight:700,fontSize:'0.9rem',color:'#1A0800'}}>{item.name}</div>
                        <div style={{fontWeight:900,color:'#E65C00',fontSize:'0.88rem',whiteSpace:'nowrap'}}>
                          {item.variants&&item.variants.length>0
                            ? item.variants.length===1
                              ? `₹${item.variants[0].price}`
                              : `₹${item.variants[0].price}–₹${item.variants[item.variants.length-1].price}`
                            : `₹${item.price}`
                          }
                        </div>
                      </div>
                      <div style={{fontSize:'0.73rem',color:'#888',marginBottom:'0.75rem',lineHeight:'1.4'}}>{item.desc}</div>
                      <div style={{display:'flex',gap:'0.35rem'}}>
                        <button onClick={()=>{setMenuModal({open:true,item:{...item},isEdit:true});setModalVariants(item.variants&&item.variants.length>0?item.variants.map(v=>({name:v.name,price:String(v.price)})):[{name:'Regular',price:String(item.price)}]);}} style={{...btn('#3b82f6'),padding:'0.3rem 0.75rem',fontSize:'0.75rem',flex:1}}>✏️ Edit</button>
                        <button onClick={()=>{saveMenuItemApi({id:item.id,available:item.available===false}).then(()=>refresh()).catch(e=>alert(String(e)));}} style={{...btn(item.available===false?'#16a34a':'#6b7280'),padding:'0.3rem 0.65rem',fontSize:'0.75rem'}}>{item.available===false?'✅':'⏸'}</button>
                        <button onClick={()=>{if(confirm(`Delete "${item.name}"?`)){deleteMenuItemApi(item.id).then(()=>refresh()).catch(e=>alert(String(e)));}}} style={{...btn('#ef4444'),padding:'0.3rem 0.6rem',fontSize:'0.75rem'}}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
        </>}

        {/* ═══════════ TABLES MANAGEMENT ═══════════ */}
        {section==='tables' && <>
          <div style={card('#E65C00')}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700,marginBottom:'0.3rem',color:'#1A0800'}}>🪑 Tables Management</h2>
            <p style={{fontSize:'0.78rem',color:'#666',marginBottom:'1rem'}}>Add, edit or remove tables. Changes sync instantly to QR, waiter, kitchen and manager portals.</p>

            {tableMsg && (
              <div style={{padding:'0.6rem 0.8rem',borderRadius:8,background:tableMsg.startsWith('✅')?'#dcfce7':'#fef2f2',color:tableMsg.startsWith('✅')?'#16a34a':'#ef4444',fontWeight:700,fontSize:'0.82rem',marginBottom:'1rem'}}>
                {tableMsg}
              </div>
            )}

            {/* Add Table Form */}
            <div style={{background:'#faf8f3',borderRadius:10,padding:'1rem',marginBottom:'1.25rem',border:'1px solid #e5e7eb'}}>
              <h3 style={{fontSize:'0.88rem',fontWeight:700,color:'#1A0800',marginBottom:'0.7rem'}}>➕ Add New Table</h3>
              <div style={{display:'grid',gridTemplateColumns:'1fr 120px auto',gap:'0.75rem',alignItems:'flex-end'}}>
                <div>
                  <label style={{fontSize:'0.73rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Table Name / Number</label>
                  <input value={tableForm.name} onChange={e=>setTableForm(f=>({...f,name:e.target.value}))} placeholder="e.g. T1 or Table 5" style={{...inp}} />
                </div>
                <div>
                  <label style={{fontSize:'0.73rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Seats</label>
                  <input type="number" min={1} max={50} value={tableForm.capacity} onChange={e=>setTableForm(f=>({...f,capacity:e.target.value}))} style={{...inp,textAlign:'center'}} />
                </div>
                <button onClick={handleAddTable} style={{...btn('#E65C00'),whiteSpace:'nowrap' as const}}>+ Add Table</button>
              </div>
            </div>

            {/* Existing Tables */}
            <h3 style={{fontSize:'0.88rem',fontWeight:700,color:'#1A0800',marginBottom:'0.7rem'}}>All Tables ({liveTables.length})</h3>
            {liveTables.length === 0 && (
              <div style={{textAlign:'center',padding:'2rem',color:'#999',fontSize:'0.85rem'}}>No tables found. Add your first table above.</div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'0.75rem'}}>
              {liveTables.map(t => {
                const isEditing  = editTableId === t.id;
                const isOccupied = t.status === 'occupied';
                const sessionMins = t.sessionStart
                  ? Math.floor((Date.now()-new Date(t.sessionStart).getTime())/60000)
                  : null;
                const STALE_MINS = 240;
                const isStale   = sessionMins !== null && sessionMins >= STALE_MINS;
                const fmtDuration = (m: number) =>
                  m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`;
                const borderColor =
                  !isOccupied ? '#e5e7eb' :
                  isStale     ? '#dc2626' :
                                '#f97316';
                const statusBg    = !isOccupied ? '#d1fae5' : isStale ? '#fee2e2' : '#fed7aa';
                const statusColor = !isOccupied ? '#065f46' : isStale ? '#991b1b' : '#92400e';
                const statusLabel = !isOccupied ? '🟢 Available' : isStale ? '🔴 Stale Session' : '🟠 Occupied';
                return (
                  <div key={t.id} style={{background:'white',border:`2px solid ${borderColor}`,borderRadius:12,padding:'0.85rem 1rem'}}>
                    {isEditing ? (
                      <>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:'0.5rem',marginBottom:'0.6rem'}}>
                          <input value={editTableVal.name} onChange={e=>setEditTableVal(v=>({...v,name:e.target.value}))} placeholder="Table name" style={{...inp,fontSize:'0.85rem'}} />
                          <input type="number" min={1} max={50} value={editTableVal.capacity} onChange={e=>setEditTableVal(v=>({...v,capacity:e.target.value}))} style={{...inp,fontSize:'0.85rem',textAlign:'center'}} />
                        </div>
                        <div style={{display:'flex',gap:'0.5rem'}}>
                          <button onClick={()=>handleSaveTableEdit(t.id)} style={{...btn('#16a34a'),flex:1,fontSize:'0.78rem'}}>💾 Save</button>
                          <button onClick={()=>setEditTableId('')} style={{...btn('#6b7280'),flex:1,fontSize:'0.78rem'}}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.4rem'}}>
                          <div style={{fontWeight:800,fontSize:'1rem',color:'#1A0800'}}>{t.name}</div>
                          <span style={{fontSize:'0.7rem',fontWeight:700,background:statusBg,color:statusColor,borderRadius:20,padding:'0.15rem 0.5rem'}}>
                            {statusLabel}
                          </span>
                        </div>
                        <div style={{fontSize:'0.78rem',color:'#666',marginBottom:'0.5rem'}}>
                          🪑 {t.capacity} seat{t.capacity!==1?'s':''} &nbsp;·&nbsp; ID: <code style={{fontSize:'0.68rem',background:'#f3f4f6',padding:'0.1rem 0.3rem',borderRadius:4}}>{t.id}</code>
                        </div>
                        {/* Session info for occupied tables */}
                        {isOccupied && sessionMins !== null && (
                          <div style={{fontSize:'0.72rem',color:isStale?'#dc2626':'#f97316',fontWeight:600,marginBottom:'0.5rem',background:isStale?'#fee2e2':'#fff7ed',borderRadius:6,padding:'0.25rem 0.5rem'}}>
                            ⏱ Session open for <strong>{fmtDuration(sessionMins)}</strong>
                            {isStale && ' — likely abandoned, consider force-closing'}
                          </div>
                        )}
                        <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap'}}>
                          <button onClick={()=>{setEditTableId(t.id);setEditTableVal({name:t.name,capacity:String(t.capacity)});}} style={{...btn('#E65C00'),flex:1,fontSize:'0.72rem',padding:'0.35rem 0.5rem'}}>✏️ Edit</button>
                          {/* Force-close button: visible for any occupied table, prominent for stale */}
                          {isOccupied && t.sessionTabId && (
                            <button
                              onClick={()=>handleForceCloseSession(t.id, t.sessionTabId!, t.name)}
                              style={{...btn(isStale?'#dc2626':'#6b7280'),flex:1,fontSize:'0.72rem',padding:'0.35rem 0.5rem'}}
                              title="Admin override: force-close this session"
                            >
                              {isStale ? '🔴 Force Close' : '🔒 Close Session'}
                            </button>
                          )}
                          <button onClick={()=>handleDeleteTable(t.id,t.name)} disabled={isOccupied} title={isOccupied?'Force-close the session first, then delete':'Delete table'} style={{...btn(isOccupied?'#d1d5db':'#ef4444',isOccupied?'#9ca3af':'white'),flex:1,fontSize:'0.72rem',padding:'0.35rem 0.5rem',cursor:isOccupied?'not-allowed':'pointer'}}>🗑️ Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary stats */}
            {liveTables.length > 0 && (
              <div style={{marginTop:'1.25rem',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:'0.6rem'}}>
                {[
                  {icon:'🪑',val:liveTables.length,label:'Total Tables',color:'#E65C00'},
                  {icon:'🔴',val:liveTables.filter(t=>t.status==='occupied').length,label:'Occupied',color:'#f97316'},
                  {icon:'🟢',val:liveTables.filter(t=>t.status==='available').length,label:'Available',color:'#16a34a'},
                  {icon:'👥',val:liveTables.reduce((s,t)=>s+t.capacity,0),label:'Total Seats',color:'#3b82f6'},
                ].map(s=>(
                  <div key={s.label} style={{background:'white',padding:'0.75rem',borderRadius:10,textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',borderLeft:`3px solid ${s.color}`}}>
                    <div style={{fontSize:'1.4rem',marginBottom:'0.1rem'}}>{s.icon}</div>
                    <div style={{fontWeight:900,fontSize:'1.2rem',color:s.color}}>{s.val}</div>
                    <div style={{fontSize:'0.68rem',color:'#888'}}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>}

        {/* ═══════════ FRAUD / TRANSPARENCY ═══════════ */}
        {section==='fraud' && <>
          {alerts.length>0 && (
            <div style={{background:'#fef2f2',border:'2px solid #ef4444',borderRadius:12,padding:'1.2rem',marginBottom:'1.4rem'}}>
              <h3 style={{color:'#ef4444',fontWeight:700,marginBottom:'0.6rem',fontSize:'0.92rem'}}>🚨 Active Alerts</h3>
              {alerts.map((a,i)=><div key={i} style={{color:'#7f1d1d',fontSize:'0.85rem',padding:'0.25rem 0',borderBottom:'1px solid #fecaca'}}>{a}</div>)}
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:'0.7rem',marginBottom:'1.4rem'}}>
            {[{val:`${cancelRate}%`,label:'Cancel Rate',color:'#ef4444'},{val:cancelledOrders.length,label:'Total Cancelled',color:'#f97316'},{val:discountOrders.length,label:'Discounted Orders',color:'#8b5cf6'},{val:`₹${orders.reduce((s,o)=>s+(o.discount||0),0)}`,label:'All-Time Discounts',color:'#E65C00'},{val:highDiscOrders.length,label:'High Disc. (>30%)',color:'#dc2626'}].map(c=>(
              <div key={c.label} style={{background:'white',border:'1px solid #f0e4d7',borderRadius:10,padding:'0.82rem',borderLeft:`4px solid ${c.color}`}}>
                <div style={{fontSize:'1.25rem',fontWeight:900,color:c.color}}>{c.val}</div>
                <div style={{fontSize:'0.7rem',color:'#999'}}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Discount log */}
          <div style={card('#8b5cf6')}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'0.98rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>🏷️ Discount Log</h3>
            {!discountOrders.length
              ? <div style={{color:'#999',fontSize:'0.85rem'}}>No discounts applied yet</div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
                    <thead><tr style={{background:'#f5f3ff'}}>
                      {['Order','Customer','Date','Subtotal','Discount','% Off','Reason','Status'].map(h=><th key={h} style={{padding:'0.48rem 0.7rem',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:'#6d28d9',textTransform:'uppercase'}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {discountOrders.map(o=>{
                        const sub=o.subtotal||o.total;
                        const pct=Math.round(((o.discount||0)/sub)*100);
                        return (
                          <tr key={o.id} style={{borderBottom:'1px solid #f5f0e8',background:pct>30?'#fef2f2':'white'}}>
                            <td style={{padding:'0.48rem 0.7rem'}}><button onClick={()=>setSelOrder(o)} style={{background:'none',border:'none',color:'#E65C00',textDecoration:'underline',fontWeight:700,cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'0.8rem'}}>{o.id}</button></td>
                            <td style={{padding:'0.48rem 0.7rem',fontWeight:600}}>{o.customerName}</td>
                            <td style={{padding:'0.48rem 0.7rem',color:'#888'}}>{new Date(o.timestamp).toLocaleDateString()}</td>
                            <td style={{padding:'0.48rem 0.7rem'}}>₹{sub}</td>
                            <td style={{padding:'0.48rem 0.7rem',color:'#16a34a',fontWeight:700}}>-₹{o.discount}</td>
                            <td style={{padding:'0.48rem 0.7rem'}}><span style={{fontWeight:700,color:pct>30?'#ef4444':'#888'}}>{pct}%{pct>30?' ⚠️':''}</span></td>
                            <td style={{padding:'0.48rem 0.7rem',color:'#555'}}>{o.discountReason||'—'}</td>
                            <td style={{padding:'0.48rem 0.7rem'}}><span style={{fontSize:'0.7rem',fontWeight:700,padding:'0.12rem 0.45rem',borderRadius:10,background:(STATUS_COLOR[o.status]||'#888')+'22',color:STATUS_COLOR[o.status]||'#888',textTransform:'capitalize'}}>{o.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            }
          </div>

          {/* Cancellation log */}
          <div style={card('#ef4444')}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'0.98rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>❌ Cancellation Log</h3>
            {!cancelledOrders.length
              ? <div style={{color:'#999',fontSize:'0.85rem'}}>No cancellations recorded</div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
                    <thead><tr style={{background:'#fef2f2'}}>
                      {['Order','Customer','Type','Amount','Cancelled At','Reason'].map(h=><th key={h} style={{padding:'0.48rem 0.7rem',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:'#991b1b',textTransform:'uppercase'}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {cancelledOrders.map(o=>(
                        <tr key={o.id} style={{borderBottom:'1px solid #fee2e2'}}>
                          <td style={{padding:'0.48rem 0.7rem'}}><button onClick={()=>setSelOrder(o)} style={{background:'none',border:'none',color:'#E65C00',textDecoration:'underline',fontWeight:700,cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'0.8rem'}}>{o.id}</button></td>
                          <td style={{padding:'0.48rem 0.7rem',fontWeight:600}}>{o.customerName}</td>
                          <td style={{padding:'0.48rem 0.7rem',textTransform:'capitalize'}}>{o.type}</td>
                          <td style={{padding:'0.48rem 0.7rem',fontWeight:700,color:'#ef4444'}}>₹{o.total}</td>
                          <td style={{padding:'0.48rem 0.7rem',color:'#888'}}>{new Date(o.timestamp).toLocaleString()}</td>
                          <td style={{padding:'0.48rem 0.7rem',color:'#555'}}>{o.cancelReason||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>

          {/* Issue / Not-Received Log */}
          <div style={card('#dc2626')}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'0.98rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>🚨 Not-Received Issue Log — Today</h3>
            {!todayIssues.length
              ? <div style={{color:'#999',fontSize:'0.85rem'}}>No issues reported today</div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
                    <thead><tr style={{background:'#fef2f2'}}>
                      {['Order','Reported By','Retries','Status','Escalated','Reported At','Resolved By','Resolved At'].map(h=>(
                        <th key={h} style={{padding:'0.48rem 0.7rem',textAlign:'left',fontSize:'0.68rem',fontWeight:700,color:'#991b1b',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {todayIssues.map(issue => {
                        const relOrd = orders.find(o => o.id === issue.orderId);
                        return (
                          <tr key={issue.id} style={{borderBottom:'1px solid #fee2e2',background:issue.escalated?'#fef2f2':'white'}}>
                            <td style={{padding:'0.48rem 0.7rem',fontWeight:700,color:'#dc2626'}}>{relOrd?.orderNum || issue.orderId.slice(-6)}</td>
                            <td style={{padding:'0.48rem 0.7rem'}}>{issue.reportedBy}</td>
                            <td style={{padding:'0.48rem 0.7rem',textAlign:'center',fontWeight:700,color:issue.retryCount>=3?'#dc2626':'#555'}}>#{issue.retryCount}</td>
                            <td style={{padding:'0.48rem 0.7rem'}}>
                              <span style={{fontSize:'0.7rem',fontWeight:700,padding:'0.12rem 0.45rem',borderRadius:10,background:issue.status==='resolved'?'#dcfce7':issue.status==='reserving'?'#dbeafe':'#fef9c3',color:issue.status==='resolved'?'#16a34a':issue.status==='reserving'?'#1d4ed8':'#854d0e'}}>
                                {issue.status}
                              </span>
                            </td>
                            <td style={{padding:'0.48rem 0.7rem',textAlign:'center'}}>{issue.escalated?<span style={{color:'#dc2626',fontWeight:800}}>⬆ YES</span>:'—'}</td>
                            <td style={{padding:'0.48rem 0.7rem',color:'#888',whiteSpace:'nowrap'}}>{new Date(issue.reportedAt).toLocaleTimeString()}</td>
                            <td style={{padding:'0.48rem 0.7rem',color:'#555'}}>{issue.resolvedBy || '—'}</td>
                            <td style={{padding:'0.48rem 0.7rem',color:'#888',whiteSpace:'nowrap'}}>{issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleTimeString() : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            }
          </div>

          {/* Staff Accountability */}
          <div style={card('#06b6d4')}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'0.98rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>👤 Staff Accountability — Today</h3>
            {!waiterStats.length
              ? <div style={{color:'#999',fontSize:'0.85rem'}}>No waiter activity recorded today.</div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                    <thead><tr style={{background:'#ecfeff'}}>
                      {['Waiter','Accepted','Cancelled','Served','Cancel Rate'].map(h=>(
                        <th key={h} style={{padding:'0.48rem 0.75rem',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:'#0e7490',textTransform:'uppercase'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {waiterStats.map((s,i)=>{
                        const isFlagged = s.cancellationRate > 20;
                        return (
                          <tr key={s.name} style={{borderBottom:'1px solid #cffafe',background:isFlagged?'#fef2f2':i%2?'#f0fdfe':'white'}}>
                            <td style={{padding:'0.48rem 0.75rem',fontWeight:700,color:'#1A0800'}}>{s.name}{isFlagged&&<span style={{marginLeft:'0.3rem',color:'#ef4444',fontSize:'0.7rem'}}>⚠️ High</span>}</td>
                            <td style={{padding:'0.48rem 0.75rem',fontWeight:700,color:'#16a34a'}}>{s.ordersAccepted}</td>
                            <td style={{padding:'0.48rem 0.75rem',fontWeight:700,color:s.ordersCancelled>0?'#ef4444':'#9ca3af'}}>{s.ordersCancelled}</td>
                            <td style={{padding:'0.48rem 0.75rem',fontWeight:700,color:'#06b6d4'}}>{s.ordersServed}</td>
                            <td style={{padding:'0.48rem 0.75rem'}}>
                              <span style={{fontWeight:700,color:s.cancellationRate>20?'#ef4444':s.cancellationRate>10?'#f59e0b':'#16a34a'}}>
                                {s.cancellationRate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            }
          </div>

          {/* ── Analytics Charts (Recharts) ────── */}
          <Suspense fallback={<div style={{padding:'1rem',textAlign:'center',color:'#94a3b8'}}>Loading charts…</div>}>
            <AnalyticsCharts period={salesTab} />
          </Suspense>

        {/* Fraud Alert Log — derived from live Supabase orders */}
          {(() => {
            // Build fraud log from live order timeline events (replaces localStorage getFraudAlerts)
            const fraudAlerts = orders
              .flatMap(o => (o.timeline||[])
                .filter(e => ['OrderCancelled','FoodDisputed','DisputeResolved'].includes(e.eventType))
                .map(e => ({
                  id:     `${o.id}-${e.eventType}`,
                  type:   e.eventType,
                  detail: `Order #${o.orderNum||o.id.slice(-6)} — ${o.customerName}`,
                  by:     e.by || 'System',
                  amount: e.eventType === 'OrderCancelled' ? (o.total||0) : 0,
                  at:     e.at || o.timestamp,
                }))
              )
              .sort((a,b) => new Date(b.at).getTime() - new Date(a.at).getTime())
              .slice(0, 20);
            if (!fraudAlerts.length) return null;
            return (
              <div style={card('#f97316')}>
                <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'0.98rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>🚨 Fraud Alert Log</h3>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
                    <thead><tr style={{background:'#fff7ed'}}>
                      {['Type','Detail','By','Amount','Date'].map(h=><th key={h} style={{padding:'0.48rem 0.7rem',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:'#9a3412',textTransform:'uppercase'}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {fraudAlerts.map(a=>(
                        <tr key={a.id} style={{borderBottom:'1px solid #fed7aa'}}>
                          <td style={{padding:'0.48rem 0.7rem'}}><span style={{fontSize:'0.7rem',fontWeight:700,padding:'0.12rem 0.45rem',borderRadius:10,background:'#fff7ed',color:'#ea580c'}}>{a.type.replace(/_/g,' ')}</span></td>
                          <td style={{padding:'0.48rem 0.7rem',color:'#555',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.detail}</td>
                          <td style={{padding:'0.48rem 0.7rem',fontWeight:600}}>{a.by}</td>
                          <td style={{padding:'0.48rem 0.7rem',color:'#ef4444',fontWeight:700}}>{a.amount?`₹${a.amount}`:'—'}</td>
                          <td style={{padding:'0.48rem 0.7rem',color:'#888',fontSize:'0.75rem'}}>{new Date(a.at).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </>}

        {/* ═══════════ STAFF ═══════════ */}
        {section==='staff' && <>

          {/* ── Admin PIN Change ── */}
          <div style={card('#E65C00')}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.2rem',color:'#1A0800'}}>🔐 Change Admin PIN</h3>
            <p style={{fontSize:'0.78rem',color:'#888',marginBottom:'0.85rem'}}>Used to login to this dashboard and authorise discounts. Requires your current PIN to change.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.75rem',alignItems:'flex-end'}}>
              <div>
                <label style={{fontSize:'0.72rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Current PIN</label>
                <input type="password" inputMode="numeric" value={adminPinOld} onChange={e=>setAdminPinOld(e.target.value.replace(/\D/g,''))} maxLength={8} placeholder="••••" style={{...inp,letterSpacing:'0.4em',textAlign:'center'}} />
              </div>
              <div>
                <label style={{fontSize:'0.72rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>New PIN</label>
                <input type="password" inputMode="numeric" value={adminNewPin} onChange={e=>setAdminNewPin(e.target.value.replace(/\D/g,''))} maxLength={8} placeholder="••••" style={{...inp,letterSpacing:'0.4em',textAlign:'center'}} />
              </div>
              <div>
                <label style={{fontSize:'0.72rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Confirm PIN</label>
                <input type="password" inputMode="numeric" value={adminNewPin2} onChange={e=>setAdminNewPin2(e.target.value.replace(/\D/g,''))} maxLength={8} placeholder="••••" style={{...inp,letterSpacing:'0.4em',textAlign:'center'}} />
              </div>
            </div>
            {adminPinMsg && <div style={{fontSize:'0.78rem',color:adminPinMsg.includes('✅')?'#16a34a':'#ef4444',margin:'0.5rem 0'}}>{adminPinMsg}</div>}
            <button onClick={changeAdminPin} style={{...btn('#E65C00'),marginTop:'0.75rem'}}>🔐 Update Admin PIN</button>
          </div>

          {/* ── Security Question ── */}
          <div style={card('#7c3aed')}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.2rem',color:'#1A0800'}}>🛡️ PIN Recovery — Security Question</h3>
            <p style={{fontSize:'0.78rem',color:'#888',marginBottom:'0.75rem'}}>
              Set a security question so you can reset your PIN if you ever forget it.
              {secSetup && <span style={{color:'#16a34a',marginLeft:'0.3rem'}}>✅ Set up on {new Date(secSetup.setupAt).toLocaleDateString('en-IN')}</span>}
            </p>
            {secSetup && (
              <div style={{background:'#f0fdf4',borderRadius:8,padding:'0.6rem 0.85rem',marginBottom:'0.75rem',fontSize:'0.83rem',color:'#166534',fontWeight:600}}>
                Current question: &quot;{secSetup.question}&quot;
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.75rem',marginBottom:'0.75rem'}}>
              <div style={{gridColumn:'1/-1'}}>
                <label style={{fontSize:'0.72rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Security Question</label>
                <select
                  value={secQuestion}
                  onChange={e=>setSecQuestion(e.target.value)}
                  style={{...inp,fontSize:'0.82rem'}}
                >
                  <option value="">— Select a question —</option>
                  {SECURITY_QUESTIONS.map(q=><option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'0.72rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Your Answer</label>
                <input type="text" autoComplete="off" value={secAnswer} onChange={e=>setSecAnswer(e.target.value)} placeholder="Answer (not case sensitive)" style={{...inp,fontSize:'0.82rem'}} />
              </div>
              <div>
                <label style={{fontSize:'0.72rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Confirm Answer</label>
                <input type="text" autoComplete="off" value={secAnswerConf} onChange={e=>setSecAnswerConf(e.target.value)} placeholder="Re-enter answer" style={{...inp,fontSize:'0.82rem'}} />
              </div>
            </div>
            {secMsg && <div style={{fontSize:'0.78rem',color:secMsg.includes('✅')?'#16a34a':'#ef4444',marginBottom:'0.5rem'}}>{secMsg}</div>}
            <button onClick={saveSecurityQuestion} style={{...btn('#7c3aed')}}>🛡️ {secSetup?'Update':'Save'} Security Question</button>
          </div>

          {/* Kitchen & Manager PINs — write-only; current value never shown */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1.5rem'}}>
            <div style={card('#3b82f6')}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>🔥 Kitchen PIN</h3>
              <p style={{fontSize:'0.78rem',color:'#666',marginBottom:'0.75rem'}}>Set a new PIN for kitchen staff at <code>/kitchen</code>. Leave blank to keep current.</p>
              <input
                value={kitchenPin}
                onChange={e=>setKitchenPin(e.target.value.replace(/\D/g,''))}
                maxLength={6} type="password" inputMode="numeric" placeholder="New PIN (4+ digits)"
                style={{...inp,letterSpacing:'0.4em',textAlign:'center',marginBottom:'0.5rem'}}
              />
              {kitchenPinMsg && <div style={{fontSize:'0.75rem',color:kitchenPinMsg.includes('✅')?'#16a34a':'#ef4444',marginBottom:'0.4rem'}}>{kitchenPinMsg}</div>}
              <button onClick={saveKitchenPinFn} style={{...btn('#3b82f6'),width:'100%'}}>💾 Set Kitchen PIN</button>
            </div>
            <div style={card('#16a34a')}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>💳 Manager PIN</h3>
              <p style={{fontSize:'0.78rem',color:'#666',marginBottom:'0.75rem'}}>Set a new PIN for manager billing at <code>/manager</code>. Leave blank to keep current.</p>
              <input
                value={managerPin}
                onChange={e=>setManagerPin(e.target.value.replace(/\D/g,''))}
                maxLength={6} type="password" inputMode="numeric" placeholder="New PIN (4+ digits)"
                style={{...inp,letterSpacing:'0.4em',textAlign:'center',marginBottom:'0.5rem'}}
              />
              {managerPinMsg && <div style={{fontSize:'0.75rem',color:managerPinMsg.includes('✅')?'#16a34a':'#ef4444',marginBottom:'0.4rem'}}>{managerPinMsg}</div>}
              <button onClick={saveManagerPinFn} style={{...btn('#16a34a'),width:'100%'}}>💾 Set Manager PIN</button>
            </div>
          </div>

          {/* Create Waiter Account */}
          <div style={card('#8b5cf6')}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>➕ Create Waiter Account</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:'0.75rem',alignItems:'flex-end'}}>
              <div>
                <label style={{fontSize:'0.73rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Full Name</label>
                <input value={staffForm.name} onChange={e=>setStaffForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Ravi Kumar" style={{...inp}} />
              </div>
              <div>
                <label style={{fontSize:'0.73rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Username</label>
                <input value={staffForm.username} onChange={e=>setStaffForm(f=>({...f,username:e.target.value}))} placeholder="e.g. ravi" style={{...inp}} />
              </div>
              <div>
                <label style={{fontSize:'0.73rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>PIN (4+ digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={staffForm.pin}
                  onChange={e=>setStaffForm(f=>({...f,pin:e.target.value.replace(/\D/g,'')}))}
                  placeholder="••••"
                  maxLength={6}
                  style={{...inp,letterSpacing:'0.3em',textAlign:'center'}}
                />
              </div>
              <button onClick={addStaffAccount} style={{...btn('#8b5cf6'),padding:'0.65rem 1.1rem',whiteSpace:'nowrap' as const}}>✅ Add</button>
            </div>
            {staffMsg && <div style={{fontSize:'0.78rem',color:staffMsg.includes('✅')?'#16a34a':'#ef4444',marginTop:'0.5rem'}}>{staffMsg}</div>}
          </div>

          {/* Waiter Accounts List */}
          <div style={card()}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>
              🧑‍🍳 Waiter Accounts ({staffAccounts.length})
            </h3>
            {!staffAccounts.length
              ? <div style={{color:'#999',fontSize:'0.85rem',textAlign:'center',padding:'2rem 0'}}>No waiter accounts yet. Create one above.</div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.83rem'}}>
                    <thead>
                      <tr style={{background:'#FFF5EB'}}>
                        {['Name','Username','Status','Created','Actions'].map(h=>(
                          <th key={h} style={{padding:'0.5rem 0.75rem',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:'#6B5246',textTransform:'uppercase'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staffAccounts.map(acc=>(
                        <tr key={acc.id} style={{borderBottom:'1px solid #f5f0e8',opacity:acc.active?1:0.5}}>
                          <td style={{padding:'0.55rem 0.75rem',fontWeight:700}}>{acc.name}</td>
                          <td style={{padding:'0.55rem 0.75rem',color:'#666',fontFamily:'monospace'}}>{acc.username}</td>
                          <td style={{padding:'0.55rem 0.75rem'}}>
                            <span style={{fontSize:'0.72rem',fontWeight:700,padding:'0.18rem 0.5rem',borderRadius:10,background:acc.active?'#dcfce7':'#fee2e2',color:acc.active?'#16a34a':'#ef4444'}}>
                              {acc.active?'Active':'Inactive'}
                            </span>
                          </td>
                          <td style={{padding:'0.55rem 0.75rem',color:'#aaa',fontSize:'0.78rem'}}>
                            {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                          </td>
                          <td style={{padding:'0.55rem 0.75rem'}}>
                            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap' as const}}>
                              <button
                                onClick={()=>{ void patchStaff(acc.id, { active: !acc.active }).then(() => refresh()); }}
                                style={{...btn(acc.active?'#fef2f2':'#f0fdf4',acc.active?'#ef4444':'#16a34a'),fontSize:'0.72rem',padding:'0.25rem 0.6rem',border:`1px solid ${acc.active?'#fecaca':'#bbf7d0'}`}}
                              >
                                {acc.active?'⛔ Disable':'✅ Enable'}
                              </button>
                              {editPinId===acc.id
                                ? <div style={{display:'flex',gap:'0.3rem',alignItems:'center'}}>
                                    <input
                                      type="password"
                                      inputMode="numeric"
                                      value={editPinVal}
                                      onChange={e=>setEditPinVal(e.target.value.replace(/\D/g,''))}
                                      placeholder="New PIN"
                                      maxLength={6}
                                      style={{width:'80px',padding:'0.25rem 0.4rem',border:'2px solid #e5e7eb',borderRadius:6,fontSize:'0.78rem',fontFamily:'Poppins,sans-serif',letterSpacing:'0.3em',textAlign:'center'}}
                                    />
                                    <button onClick={()=>{ if(editPinVal.length>=4){ void patchStaff(acc.id, { pin: editPinVal }).then(() => { setEditPinId(''); setEditPinVal(''); void refresh(); }); } }} style={{...btn('#3b82f6'),fontSize:'0.72rem',padding:'0.25rem 0.5rem'}}>Save</button>
                                    <button onClick={()=>{setEditPinId('');setEditPinVal('');}} style={{...btn('#e5e7eb','#555'),fontSize:'0.72rem',padding:'0.25rem 0.5rem'}}>✕</button>
                                  </div>
                                : <button onClick={()=>{ setEditPinId(acc.id); setEditPinVal(''); }} style={{...btn('#374151'),fontSize:'0.72rem',padding:'0.25rem 0.6rem'}}>🔑 PIN</button>
                              }
                              <button
                                onClick={()=>{ if(confirm(`Delete account for ${acc.name}?`)){void removeStaff(acc.id).then(() => refresh());} }}
                                style={{...btn('#ef4444'),fontSize:'0.72rem',padding:'0.25rem 0.6rem'}}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>

          {/* ── Create Delivery Account ── */}
          <div style={card('#0f172a')}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>➕ Create Delivery Account</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:'0.75rem',alignItems:'flex-end'}}>
              <div>
                <label style={{fontSize:'0.73rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Full Name</label>
                <input value={deliveryForm.name} onChange={e=>setDeliveryForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Ravi Kumar" style={{...inp}} />
              </div>
              <div>
                <label style={{fontSize:'0.73rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>Username</label>
                <input value={deliveryForm.username} onChange={e=>setDeliveryForm(f=>({...f,username:e.target.value}))} placeholder="e.g. ravi" style={{...inp}} />
              </div>
              <div>
                <label style={{fontSize:'0.73rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.25rem'}}>PIN (4+ digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={deliveryForm.pin}
                  onChange={e=>setDeliveryForm(f=>({...f,pin:e.target.value.replace(/\D/g,'')}))}
                  placeholder="••••"
                  maxLength={6}
                  style={{...inp,letterSpacing:'0.3em',textAlign:'center'}}
                />
              </div>
              <button onClick={addDeliveryAccount} style={{...btn('#0f172a'),padding:'0.65rem 1.1rem',whiteSpace:'nowrap' as const}}>✅ Add</button>
            </div>
            {deliveryMsg && <div style={{fontSize:'0.78rem',color:deliveryMsg.includes('✅')?'#16a34a':'#ef4444',marginTop:'0.5rem'}}>{deliveryMsg}</div>}
          </div>

          {/* ── Delivery Accounts List ── */}
          <div style={card()}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>
              🛵 Delivery Accounts ({deliveryAccounts.length})
            </h3>
            {!deliveryAccounts.length
              ? <div style={{color:'#999',fontSize:'0.85rem',textAlign:'center',padding:'2rem 0'}}>No delivery accounts yet. Create one above.</div>
              : <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.83rem'}}>
                    <thead>
                      <tr style={{background:'#f8fafc'}}>
                        {['Name','Username','Status','Created','Actions'].map(h=>(
                          <th key={h} style={{padding:'0.5rem 0.75rem',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:'#475569',textTransform:'uppercase'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryAccounts.map(acc=>(
                        <tr key={acc.id} style={{borderBottom:'1px solid #f1f5f9',opacity:acc.active?1:0.5}}>
                          <td style={{padding:'0.55rem 0.75rem',fontWeight:700}}>{acc.name}</td>
                          <td style={{padding:'0.55rem 0.75rem',color:'#666',fontFamily:'monospace'}}>{acc.username}</td>
                          <td style={{padding:'0.55rem 0.75rem'}}>
                            <span style={{fontSize:'0.72rem',fontWeight:700,padding:'0.18rem 0.5rem',borderRadius:10,background:acc.active?'#dcfce7':'#fee2e2',color:acc.active?'#16a34a':'#ef4444'}}>
                              {acc.active?'Active':'Inactive'}
                            </span>
                          </td>
                          <td style={{padding:'0.55rem 0.75rem',color:'#aaa',fontSize:'0.78rem'}}>
                            {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
                          </td>
                          <td style={{padding:'0.55rem 0.75rem'}}>
                            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap' as const}}>
                              <button
                                onClick={()=>{ void patchStaff(acc.id, { active: !acc.active }).then(() => refresh()); }}
                                style={{...btn(acc.active?'#fef2f2':'#f0fdf4',acc.active?'#ef4444':'#16a34a'),fontSize:'0.72rem',padding:'0.25rem 0.6rem',border:`1px solid ${acc.active?'#fecaca':'#bbf7d0'}`}}
                              >
                                {acc.active?'⛔ Disable':'✅ Enable'}
                              </button>
                              {editDelivPinId===acc.id
                                ? <div style={{display:'flex',gap:'0.3rem',alignItems:'center'}}>
                                    <input
                                      type="password"
                                      inputMode="numeric"
                                      value={editDelivPinVal}
                                      onChange={e=>setEditDelivPinVal(e.target.value.replace(/\D/g,''))}
                                      placeholder="New PIN"
                                      maxLength={6}
                                      style={{width:'80px',padding:'0.25rem 0.4rem',border:'2px solid #e5e7eb',borderRadius:6,fontSize:'0.78rem',fontFamily:'Poppins,sans-serif',letterSpacing:'0.3em',textAlign:'center'}}
                                    />
                                    <button onClick={()=>{ if(editDelivPinVal.length>=4){ void patchStaff(acc.id, { pin: editDelivPinVal }).then(() => { setEditDelivPinId(''); setEditDelivPinVal(''); void refresh(); }); } }} style={{...btn('#3b82f6'),fontSize:'0.72rem',padding:'0.25rem 0.5rem'}}>Save</button>
                                    <button onClick={()=>{setEditDelivPinId('');setEditDelivPinVal('');}} style={{...btn('#e5e7eb','#555'),fontSize:'0.72rem',padding:'0.25rem 0.5rem'}}>✕</button>
                                  </div>
                                : <button onClick={()=>{ setEditDelivPinId(acc.id); setEditDelivPinVal(''); }} style={{...btn('#374151'),fontSize:'0.72rem',padding:'0.25rem 0.6rem'}}>🔑 PIN</button>
                              }
                              <button
                                onClick={()=>{ if(confirm(`Delete account for ${acc.name}?`)){void removeStaff(acc.id).then(() => refresh());} }}
                                style={{...btn('#ef4444'),fontSize:'0.72rem',padding:'0.25rem 0.6rem'}}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </div>

          {/* Staff portal links */}
          <div style={card()}>
            <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>🔗 Staff Portal Links</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.65rem'}}>
              {[
                {href:'/kitchen/login',  label:'🔥 Kitchen Login',    color:'#3b82f6'},
                {href:'/waiter/login',   label:'🧑‍🍳 Waiter Login',    color:'#8b5cf6'},
                {href:'/delivery/login', label:'🛵 Delivery Login',   color:'#0f172a'},
                {href:'/manager/login',  label:'💳 Manager Login',    color:'#16a34a'},
                {href:'/admin/login',    label:'🔧 Admin Login',      color:'#E65C00'},
                {href:'/online',         label:'📦 Online Ordering',  color:'#06b6d4'},
                {href:'/',               label:'🪑 Dine-In Menu',     color:'#f59e0b'},
              ].map(l=>(
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" style={{padding:'0.65rem 1rem',background:l.color,color:'white',borderRadius:8,fontWeight:700,textDecoration:'none',fontSize:'0.82rem',textAlign:'center',display:'block'}}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </>}

      </div>{/* /container */}

      {/* ═══════ ORDER DETAIL MODAL ═══════ */}
      {selOrder && (
        <div className="modal-overlay show" onClick={()=>setSelOrder(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:600,maxHeight:'90vh',overflow:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{background:'linear-gradient(135deg,#1A0800,#E65C00)',color:'white',padding:'1.2rem 1.7rem',display:'flex',justifyContent:'space-between',alignItems:'flex-start',position:'sticky',top:0,zIndex:2,borderRadius:'16px 16px 0 0'}}>
              <div>
                <div style={{fontSize:'0.68rem',opacity:0.7,textTransform:'uppercase',letterSpacing:'0.1em'}}>Order Details</div>
                <div style={{fontSize:'1.05rem',fontWeight:900,fontFamily:"'Playfair Display',serif"}}>{selOrder.id}</div>
                <div style={{fontSize:'0.75rem',opacity:0.8}}>{new Date(selOrder.timestamp).toLocaleString()}</div>
              </div>
              <div style={{display:'flex',gap:'0.5rem',alignItems:'center'}}>
                <span style={{fontSize:'0.7rem',fontWeight:700,padding:'0.18rem 0.55rem',borderRadius:10,background:(STATUS_COLOR[selOrder.status]||'#888')+'44',color:'white',textTransform:'capitalize'}}>{selOrder.status}</span>
                <button onClick={()=>setSelOrder(null)} style={{background:'none',border:'none',color:'white',fontSize:'1.7rem',cursor:'pointer',lineHeight:1}}>×</button>
              </div>
            </div>
            <div style={{padding:'1rem 1.7rem',background:'#FFFAF5',borderBottom:'1px solid #f0e4d7',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.45rem 1.5rem'}}>
              {([
                ['Customer',   selOrder.customerName],
                ['Phone',      selOrder.phone || '—'],
                ['Channel',    selOrder.source === 'online' ? '📦 Online Order' : '🍽️ In-Store'],
                ['Type',       selOrder.type === 'dine-in' ? '🍽️ Dine-In' : selOrder.type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'],
                ['Location',   selOrder.type === 'dine-in' ? `Table ${selOrder.tableId}` : selOrder.deliveryAddress ? selOrder.deliveryAddress : 'Counter Pickup'],
                ['Payment',    selOrder.payment || 'N/A'],
              ] as [string,string][]).map(([l,v])=>(
                <div key={l}><div style={{fontSize:'0.65rem',color:'#999',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>{l}</div><div style={{fontSize:'0.86rem',fontWeight:700,color:'#1A0800'}}>{v}</div></div>
              ))}
              {selOrder.cancelReason && <div style={{gridColumn:'1/-1'}}><div style={{fontSize:'0.65rem',color:'#ef4444',fontWeight:700,textTransform:'uppercase'}}>Cancel Reason</div><div style={{fontSize:'0.86rem',color:'#ef4444',fontWeight:600}}>{selOrder.cancelReason}</div></div>}
              {selOrder.discountReason && <div style={{gridColumn:'1/-1'}}><div style={{fontSize:'0.65rem',color:'#8b5cf6',fontWeight:700,textTransform:'uppercase'}}>Discount Reason</div><div style={{fontSize:'0.86rem',color:'#8b5cf6',fontWeight:600}}>{selOrder.discountReason}</div></div>}
            </div>
            <div style={{padding:'1rem 1.7rem'}}>
              <div style={{fontSize:'0.75rem',fontWeight:700,color:'#6B5246',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.5rem'}}>Items Ordered</div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.83rem'}}>
                <thead><tr style={{background:'#f5f0e8'}}>{['#','Item','Qty','Unit','Total'].map(h=><th key={h} style={{padding:'0.48rem 0.65rem',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:'#6B5246',textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {(selOrder.items||[]).map((item,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid #f5f0e8'}}>
                      <td style={{padding:'0.52rem 0.65rem',color:'#bbb'}}>{i+1}</td>
                      <td style={{padding:'0.52rem 0.65rem',fontWeight:600}}>{item.name}</td>
                      <td style={{padding:'0.52rem 0.65rem',textAlign:'center',fontWeight:700}}>{item.qty}</td>
                      <td style={{padding:'0.52rem 0.65rem'}}>₹{item.price}</td>
                      <td style={{padding:'0.52rem 0.65rem',fontWeight:700}}>₹{item.subtotal||(item.price*item.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{textAlign:'right',marginTop:'0.65rem'}}>
                <div style={{fontSize:'0.83rem',color:'#555'}}>Subtotal: <strong>₹{selOrder.subtotal||selOrder.total}</strong></div>
                {(selOrder.discount||0)>0 && <div style={{fontSize:'0.83rem',color:'#16a34a'}}>Discount: <strong>-₹{selOrder.discount}</strong></div>}
                <div style={{fontSize:'0.98rem',fontWeight:900,color:'#E65C00',borderTop:'2px solid #f0f0f0',paddingTop:'0.4rem',marginTop:'0.3rem'}}>Total: ₹{selOrder.total}</div>
              </div>
            </div>
            {(selOrder.timeline?.length ?? 0) > 0 && (
              <div style={{padding:'0.75rem 1.7rem 1.4rem',borderTop:'1px solid #f0e4d7'}}>
                <div style={{fontSize:'0.75rem',fontWeight:700,color:'#6B5246',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'0.6rem'}}>⏱ Order Timeline</div>
                {(selOrder.timeline || []).map((ev,i)=>(
                  <div key={i} style={{display:'flex',gap:'0.65rem',alignItems:'flex-start',marginBottom:'0.35rem'}}>
                    <div style={{width:9,height:9,borderRadius:'50%',background:'#E65C00',marginTop:3,flexShrink:0}}/>
                    <div>
                      <span style={{fontWeight:700,textTransform:'capitalize',color:'#333',fontSize:'0.8rem'}}>{ev.eventType?.replace(/_/g,' ')}</span>
                      {ev.by&&<span style={{color:'#888',fontSize:'0.73rem'}}> by {ev.by}</span>}
                      {ev.note&&<div style={{fontSize:'0.72rem',color:'#888',fontStyle:'italic'}}>{ev.note}</div>}
                      <div style={{fontSize:'0.7rem',color:'#bbb'}}>{ev.at ? new Date(ev.at).toLocaleTimeString() : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ MENU ADD/EDIT MODAL ═══════ */}
      {menuModal.open && (
        <div className="modal-overlay show" onClick={()=>setMenuModal({open:false,item:emptyItem(),isEdit:false})}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:510,maxHeight:'92vh',overflow:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{background:'linear-gradient(135deg,#1A0800,#E65C00)',color:'white',padding:'1.1rem 1.6rem',display:'flex',justifyContent:'space-between',alignItems:'center',borderRadius:'16px 16px 0 0',position:'sticky',top:0,zIndex:2}}>
              <span style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:'1.05rem'}}>{menuModal.isEdit?'✏️ Edit Menu Item':'➕ Add New Item'}</span>
              <button onClick={()=>setMenuModal({open:false,item:emptyItem(),isEdit:false})} style={{background:'none',border:'none',color:'white',fontSize:'1.5rem',cursor:'pointer',lineHeight:1}}>×</button>
            </div>
            <div style={{padding:'1.4rem'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.85rem',marginBottom:'0.85rem'}}>
                <div>
                  <label style={{fontSize:'0.76rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Category *</label>
                  <select value={menuModal.item.category||'Biryani'} onChange={e=>setMenuModal(m=>({...m,item:{...m.item,category:e.target.value}}))} style={{...inp}}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'0.76rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Badge</label>
                  <select value={menuModal.item.badge||''} onChange={e=>setMenuModal(m=>({...m,item:{...m.item,badge:e.target.value}}))} style={{...inp}}>
                    <option value="">— None —</option>
                    {Object.entries(BADGE_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginBottom:'0.85rem'}}>
                <label style={{fontSize:'0.76rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Item Name *</label>
                <input value={menuModal.item.name||''} onChange={e=>setMenuModal(m=>({...m,item:{...m.item,name:e.target.value}}))} placeholder="e.g. Hyderabadi Chicken Biryani" style={{...inp}} />
              </div>
              <div style={{marginBottom:'0.85rem'}}>
                <label style={{fontSize:'0.76rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Description</label>
                <textarea value={menuModal.item.desc||''} onChange={e=>setMenuModal(m=>({...m,item:{...m.item,desc:e.target.value}}))} placeholder="Short appetizing description…" rows={2} style={{...inp,resize:'vertical' as const}} />
              </div>
              <div style={{marginBottom:'0.85rem'}}>
                <label style={{fontSize:'0.76rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Pricing Variants * <span style={{fontWeight:400,color:'#999'}}>(e.g. Half / Full / 1 Piece)</span></label>
                {modalVariants.map((v,i)=>(
                  <div key={i} style={{display:'flex',gap:'0.4rem',marginBottom:'0.4rem',alignItems:'center'}}>
                    <input value={v.name} onChange={e=>updateVariantRow(i,'name',e.target.value)} placeholder="Name (e.g. Half)" style={{...inp,flex:2,padding:'0.45rem 0.6rem'}} />
                    <div style={{position:'relative',flex:1}}>
                      <span style={{position:'absolute',left:'0.5rem',top:'50%',transform:'translateY(-50%)',color:'#888',fontSize:'0.82rem'}}>₹</span>
                      <input type="number" value={v.price} onChange={e=>updateVariantRow(i,'price',e.target.value)} placeholder="0" min="1" style={{...inp,paddingLeft:'1.4rem',padding:'0.45rem 0.4rem 0.45rem 1.4rem'}} />
                    </div>
                    {modalVariants.length>1&&<button onClick={()=>removeVariantRow(i)} style={{background:'#fef2f2',border:'1px solid #fca5a5',color:'#ef4444',borderRadius:6,cursor:'pointer',padding:'0.35rem 0.5rem',fontSize:'0.85rem',flexShrink:0}}>🗑</button>}
                  </div>
                ))}
                <button onClick={addVariantRow} style={{width:'100%',background:'#f0fdf4',border:'1px dashed #16a34a',color:'#16a34a',borderRadius:8,cursor:'pointer',padding:'0.4rem',fontSize:'0.8rem',fontWeight:700,fontFamily:'Poppins,sans-serif',marginTop:'0.2rem'}}>＋ Add Variant</button>
              </div>
              <div style={{marginBottom:'1.1rem'}}>
                <label style={{fontSize:'0.76rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Image <span style={{fontWeight:400,color:'#999'}}>(paste URL or upload)</span></label>
                <div style={{display:'flex',gap:'0.4rem',alignItems:'center',marginBottom:'0.35rem'}}>
                  <input value={menuModal.item.img||''} onChange={e=>setMenuModal(m=>({...m,item:{...m.item,img:e.target.value}}))} placeholder="https://images.unsplash.com/…" style={{...inp,flex:1}} />
                  <label style={{...btn('#8b5cf6'),cursor:'pointer' as const,whiteSpace:'nowrap' as const,flexShrink:0,fontSize:'0.78rem',opacity:imgUploading?0.6:1,display:'inline-flex',alignItems:'center' as const}}>
                    {imgUploading?'⏳':'📤 Upload'}
                    <input type="file" accept="image/*" style={{display:'none'}} disabled={imgUploading} onChange={e=>{const f=e.target.files?.[0];if(f){void uploadMenuImage(f);e.target.value='';}}} />
                  </label>
                </div>
                {menuModal.item.img && (
                  <div style={{width:'100%',height:'130px',borderRadius:8,overflow:'hidden',background:'#f5f0e8'}}>
                    <img src={menuModal.item.img} alt="preview" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:'0.65rem'}}>
                <button onClick={()=>setMenuModal({open:false,item:emptyItem(),isEdit:false})} style={{...btn('#e5e7eb','#555'),flex:1}}>Cancel</button>
                <button onClick={saveItem} style={{...btn(),flex:2}}>{menuModal.isEdit?'💾 Save Changes':'✅ Add to Menu'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ CANCEL MODAL ═══════ */}
      {cancelModal.open && (
        <div className="modal-overlay show" onClick={()=>setCancelModal({open:false,orderId:''})}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:390,padding:'1.75rem',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",color:'#ef4444',marginBottom:'0.4rem',fontSize:'1.1rem'}}>❌ Cancel Order</h3>
            <p style={{fontSize:'0.82rem',color:'#666',marginBottom:'0.9rem'}}>Cannot be undone. Order stays in the Cancellation Log.</p>
            <label style={{fontSize:'0.75rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Reason *</label>
            <textarea value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="e.g. Customer request, wrong order…" rows={3} style={{...inp,marginBottom:'0.9rem',resize:'none' as const}} />
            <div style={{display:'flex',gap:'0.65rem'}}>
              <button onClick={()=>setCancelModal({open:false,orderId:''})} style={{...btn('#e5e7eb','#555'),flex:1}}>Back</button>
              <button onClick={doCancel} style={{...btn('#ef4444'),flex:2}}>Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ DISCOUNT MODAL ═══════ */}
      {discountModal.open && (
        <div className="modal-overlay show" onClick={()=>setDiscountModal({open:false,orderId:''})}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:390,padding:'1.75rem',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",color:'#8b5cf6',marginBottom:'0.4rem',fontSize:'1.1rem'}}>🏷️ Apply Discount</h3>
            <p style={{fontSize:'0.82rem',color:'#666',marginBottom:'0.9rem'}}>Owner PIN required. Every discount is logged permanently.</p>
            <label style={{fontSize:'0.75rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Discount Amount (₹)</label>
            <input type="number" value={discAmt} onChange={e=>setDiscAmt(e.target.value)} placeholder="e.g. 50" style={{...inp,marginBottom:'0.75rem'}} />
            <label style={{fontSize:'0.75rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Reason</label>
            <input value={discNote} onChange={e=>setDiscNote(e.target.value)} placeholder="e.g. Loyalty customer, complaint…" style={{...inp,marginBottom:'0.75rem'}} />
            <label style={{fontSize:'0.75rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Owner PIN</label>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="••••" maxLength={4} style={{...inp,letterSpacing:'0.35em',textAlign:'center' as const,marginBottom:'0.25rem'}} />
            {pinMsg && <div style={{fontSize:'0.76rem',color:'#ef4444',marginBottom:'0.5rem'}}>{pinMsg}</div>}
            <div style={{display:'flex',gap:'0.65rem',marginTop:'0.75rem'}}>
              <button onClick={()=>setDiscountModal({open:false,orderId:''})} style={{...btn('#e5e7eb','#555'),flex:1}}>Cancel</button>
              <button onClick={doDiscount} style={{...btn('#8b5cf6'),flex:2}}>Apply Discount</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ PIN MANAGER ═══════ */}
      {showPinMgr && (
        <div className="modal-overlay show" onClick={()=>{setShowPinMgr(false);setNewPin('');setNewPinMsg('');setAdminPinOld('');}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:350,padding:'1.75rem',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",marginBottom:'0.3rem',fontSize:'1.1rem'}}>🔑 Change Owner PIN</h3>
            <p style={{fontSize:'0.8rem',color:'#666',marginBottom:'0.9rem'}}>Used to authorise discounts. Enter your current PIN to change it.</p>
            <label style={{fontSize:'0.75rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Current PIN</label>
            <input type="password" inputMode="numeric" value={adminPinOld} onChange={e=>setAdminPinOld(e.target.value.replace(/\D/g,''))} placeholder="Current PIN" maxLength={8} style={{...inp,letterSpacing:'0.35em',textAlign:'center' as const,marginBottom:'0.6rem'}} />
            <label style={{fontSize:'0.75rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>New 4-digit PIN</label>
            <input type="password" inputMode="numeric" value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,''))} placeholder="New PIN" maxLength={8} style={{...inp,letterSpacing:'0.35em',textAlign:'center' as const,marginBottom:'0.25rem'}} />
            {newPinMsg && <div style={{fontSize:'0.76rem',color:newPinMsg.includes('✓')||newPinMsg.includes('✅')?'#16a34a':'#ef4444',marginBottom:'0.5rem'}}>{newPinMsg}</div>}
            <button onClick={async ()=>{
              if (!adminPinOld) { setNewPinMsg('❌ Enter your current PIN'); return; }
              if (newPin.length < 4) { setNewPinMsg('❌ New PIN must be at least 4 digits'); return; }
              setNewPinMsg('⏳ Updating…');
              try {
                const res = await fetch('/api/auth/change-pin', {
                  method: 'POST', headers: {'Content-Type':'application/json'},
                  body: JSON.stringify({ currentPin: adminPinOld, newPin }),
                });
                const result = await res.json() as { ok: boolean; error?: string };
                if (!result.ok) { setNewPinMsg(`❌ ${result.error ?? 'Failed'}`); return; }
                setNewPinMsg('✅ PIN updated!');
                setTimeout(()=>{ setShowPinMgr(false); setNewPin(''); setNewPinMsg(''); setAdminPinOld(''); }, 1500);
              } catch { setNewPinMsg('❌ Server error'); }
            }} style={{...btn(),width:'100%',marginTop:'0.5rem'}}>Update PIN</button>
          </div>
        </div>
      )}

    </div>
  );
}
