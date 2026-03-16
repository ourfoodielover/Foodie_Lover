'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getOrders, getTables, getMenu, saveMenu, getPin, savePin,
  updateOrderStatus, cancelOrder, applyDiscount, exportOrdersCSV, getOrdersInPeriod,
  getEndOfDayReport, getWaiterStats, getTableOccupancyStats, getFraudAlerts,
  getOnlineOrderStats,
  Order, Table, MenuItem, DEFAULT_MENU, WaiterStats, TableOccupancyStats, OnlineOrderStats,
} from '@/lib/storage';
import {
  getSession, clearSession, AuthSession,
  getStaffAccounts, createStaffAccount, deleteStaffAccount, toggleStaffAccount, updateStaffPin,
  getKitchenPin, saveKitchenPin, getManagerPin, saveManagerPin,
  getSecuritySetup, saveSecuritySetup, verifySecurityAnswer,
  SECURITY_QUESTIONS,
  StaffAccount,
} from '@/lib/auth';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_FLOW = ['pending','preparing','prepared','served','completed'] as const;
const CATEGORIES  = ['Biryani','Starters','Mains','Breads','Desserts','Drinks'];
const BADGE_LABEL : Record<string,string> = { bestseller:'⭐ Bestseller', popular:'🔥 Popular', chef:"👨‍🍳 Chef's Special", famous:'🏆 Famous', new:'✨ New' };
const STATUS_COLOR: Record<string,string> = { pending:'#f59e0b', preparing:'#3b82f6', prepared:'#8b5cf6', served:'#06b6d4', completed:'#16a34a', cancelled:'#ef4444' };

// ─── Style helpers ────────────────────────────────────────────────────────────
const card  = (color='#E65C00') => ({ background:'white' as const, borderRadius:12, padding:'1.4rem', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', marginBottom:'1.5rem', borderLeft:`4px solid ${color}` });
const tabB  = (active:boolean)  => ({ padding:'0.42rem 1rem', border:`2px solid ${active?'#E65C00':'#ddd'}`, borderRadius:20, background:active?'#E65C00':'white' as const, color:active?'white' as const:'#666' as const, fontWeight:600 as const, cursor:'pointer' as const, fontSize:'0.8rem', fontFamily:'Poppins,sans-serif' });
const inp   = { width:'100%', padding:'0.6rem 0.75rem', border:'2px solid #e5e7eb', borderRadius:8, fontFamily:'Poppins,sans-serif', fontSize:'0.88rem', outline:'none' as const };
const btn   = (bg='#E65C00',c='white') => ({ background:bg, color:c, border:'none', padding:'0.55rem 1.1rem', borderRadius:8, fontWeight:700 as const, cursor:'pointer' as const, fontFamily:'Poppins,sans-serif', fontSize:'0.84rem' });
const emptyItem = ():Partial<MenuItem> => ({ category:'Biryani', name:'', desc:'', price:0, img:'', badge:'', available:true });

export default function AdminPage() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [tables,  setTables]  = useState<Table[]>([]);
  const [menu,    setMenu]    = useState<MenuItem[]>([]);
  const [clock,   setClock]   = useState({ date:'', time:'' });

  // ── Auth ──
  const router                          = useRouter();
  const [authSession, setAuthSession]   = useState<AuthSession | null>(null);
  const [authChecked, setAuthChecked]   = useState(false);

  // ── Navigation ──
  type Section = 'overview'|'orders'|'sales'|'menu'|'fraud'|'staff';
  const [section, setSection] = useState<Section>('overview');

  // ── Tabs / filters ──
  const [salesTab,    setSalesTab]    = useState<'today'|'week'|'month'|'all'>('today');
  const [orderFilter, setOrderFilter] = useState('all');
  const [menuFilter,  setMenuFilter]  = useState('All');

  // ── Modals ──
  const [selOrder,      setSelOrder]      = useState<Order|null>(null);
  const [menuModal,     setMenuModal]     = useState<{open:boolean;item:Partial<MenuItem>;isEdit:boolean}>({open:false,item:emptyItem(),isEdit:false});
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

  // ── Staff management state ──
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [staffForm,  setStaffForm]  = useState({ name: '', username: '', pin: '' });
  const [staffMsg,   setStaffMsg]   = useState('');
  const [kitchenPin, setKitchenPin] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [kitchenPinMsg, setKitchenPinMsg] = useState('');
  const [managerPinMsg, setManagerPinMsg] = useState('');
  const [editPinId,  setEditPinId]  = useState('');
  const [editPinVal, setEditPinVal] = useState('');

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
  const [secSetup,       setSecSetup]       = useState<ReturnType<typeof getSecuritySetup>>(null);

  // ── Data refresh ──
  const refresh = useCallback(() => {
    setOrders(getOrders());
    setTables(getTables());
    setMenu(getMenu());
    setStaffAccounts(getStaffAccounts());
    setKitchenPin(getKitchenPin());
    setManagerPin(getManagerPin());
    setSecSetup(getSecuritySetup());
    setWaiterStats(getWaiterStats());
    setTableOccupancy(getTableOccupancyStats());
    setOnlineStats(getOnlineOrderStats());
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

  function adminLogout() {
    clearSession('admin');
    router.replace('/admin/login');
  }

  // ─── Today stats ──────────────────────────────────────────────────────────
  const todayStr      = new Date().toDateString();
  const todayOrders   = orders.filter(o => new Date(o.timestamp).toDateString()===todayStr && o.status!=='cancelled');
  const todayRevenue  = todayOrders.reduce((s,o)=>s+(o.total||0),0);
  const todayDiscount = todayOrders.reduce((s,o)=>s+(o.discount||0),0);
  const todayCancel   = orders.filter(o => o.status === 'cancelled' && new Date(o.timestamp).toDateString()===todayStr);
  const activeTables  = tables.filter(t=>t.status==='occupied').length;
  const pendingCount  = orders.filter(o=>o.status==='pending').length;

  // ─── Order actions ────────────────────────────────────────────────────────
  function advance(id:string) {
    const o = orders.find(x=>x.id===id);
    if (!o) return;

    const curIdx = STATUS_FLOW.indexOf(o.status as typeof STATUS_FLOW[number]);
    // Guard: unknown status or already at the final step
    if (curIdx === -1 || curIdx >= STATUS_FLOW.length - 1) return;

    const next = STATUS_FLOW[curIdx + 1];

    // Admin always uses force=true — full control over the order lifecycle
    updateOrderStatus(id, next, 'Admin', true);
    refresh();
  }

  function doCancel() {
    if (!cancelReason.trim()) { alert('Please enter a reason'); return; }
    const ok = cancelOrder(cancelModal.orderId, cancelReason, 'Admin');
    if (!ok) {
      alert('This order can no longer be cancelled. It may already be prepared or completed.');
      setCancelModal({open:false,orderId:''}); setCancelReason(''); return;
    }
    setCancelModal({open:false,orderId:''}); setCancelReason(''); refresh();
    if (selOrder?.id===cancelModal.orderId) setSelOrder(null);
  }

  function doDiscount() {
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

    if (pinInput !== getPin()) { setPinMsg('❌ Wrong PIN'); return; }
    applyDiscount(discountModal.orderId, amt, discNote||'Owner discount', 'Admin');
    setDiscountModal({open:false,orderId:''}); setDiscAmt(''); setDiscNote(''); setPinInput(''); setPinMsg(''); refresh();
  }

  // ─── Menu CRUD ────────────────────────────────────────────────────────────
  function saveItem() {
    const it = menuModal.item;
    if (!it.name?.trim()) { alert('Item name required'); return; }
    if (!it.price||it.price<=0) { alert('Enter valid price'); return; }
    if (menuModal.isEdit) {
      saveMenu(menu.map(m => m.id===it.id ? {...m,...it} as MenuItem : m));
    } else {
      const nid = `M${Date.now()}`;
      saveMenu([...menu,{id:nid,category:it.category||'Biryani',name:it.name||'',desc:it.desc||'',price:it.price||0,img:it.img||'',badge:it.badge||'',available:true}]);
    }
    setMenuModal({open:false,item:emptyItem(),isEdit:false}); refresh();
  }

  // ─── Sales data ───────────────────────────────────────────────────────────
  const periodOrders = getOrdersInPeriod(salesTab);
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
  const filteredOrders = (orderFilter==='all' ? orders : orders.filter(o=>o.status===orderFilter)).slice(-60).reverse();
  const menuItems      = menuFilter==='All' ? menu : menu.filter(m=>m.category===menuFilter);

  // ─── Nav button ───────────────────────────────────────────────────────────
  const NavBtn = ({id,label}:{id:Section;label:string}) => (
    <button onClick={()=>setSection(id)} style={{padding:'0.55rem 1.25rem',border:'none',background:section===id?'#E65C00':'transparent',color:section===id?'white':'#bbb',fontWeight:700,cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'0.83rem',borderRadius:6,transition:'all .2s',whiteSpace:'nowrap' as const}}>{label}</button>
  );

  // ── Admin PIN change ─────────────────────────────────────────────────────
  function changeAdminPin() {
    setAdminPinMsg('');
    if (!adminPinOld) { setAdminPinMsg('❌ Enter your current PIN'); return; }
    if (adminPinOld !== getPin()) { setAdminPinMsg('❌ Current PIN is incorrect'); return; }
    if (adminNewPin.length < 4) { setAdminPinMsg('❌ New PIN must be at least 4 digits'); return; }
    if (adminNewPin !== adminNewPin2) { setAdminPinMsg('❌ New PINs do not match'); return; }
    savePin(adminNewPin);
    setAdminPinMsg('✅ Admin PIN updated successfully!');
    setAdminPinOld(''); setAdminNewPin(''); setAdminNewPin2('');
    setTimeout(() => setAdminPinMsg(''), 4000);
  }

  // ── Security question setup ───────────────────────────────────────────────
  function saveSecurityQuestion() {
    setSecMsg('');
    if (!secQuestion) { setSecMsg('❌ Select a security question'); return; }
    if (!secAnswer.trim()) { setSecMsg('❌ Enter your answer'); return; }
    if (secAnswer.toLowerCase().trim() !== secAnswerConf.toLowerCase().trim()) {
      setSecMsg('❌ Answers do not match'); return;
    }
    saveSecuritySetup(secQuestion, secAnswer);
    setSecMsg('✅ Security question saved! You can now recover your PIN if forgotten.');
    setSecQuestion(''); setSecAnswer(''); setSecAnswerConf('');
    refresh();
    setTimeout(() => setSecMsg(''), 5000);
  }

  // ── Staff management actions ─────────────────────────────────────────────
  function addStaffAccount() {
    if (!staffForm.name.trim() || !staffForm.username.trim() || !staffForm.pin.trim()) {
      setStaffMsg('❌ All fields required'); return;
    }
    const result = createStaffAccount(staffForm.name, staffForm.username, staffForm.pin);
    if ('error' in result) { setStaffMsg(`❌ ${result.error}`); return; }
    setStaffMsg(`✅ Account created for ${result.name}`);
    setStaffForm({ name: '', username: '', pin: '' });
    refresh();
  }

  function saveKitchenPinFn() {
    if (kitchenPin.length < 4) { setKitchenPinMsg('❌ PIN must be 4+ digits'); return; }
    saveKitchenPin(kitchenPin);
    setKitchenPinMsg('✅ Kitchen PIN updated');
    setTimeout(() => setKitchenPinMsg(''), 3000);
  }

  function saveManagerPinFn() {
    if (managerPin.length < 4) { setManagerPinMsg('❌ PIN must be 4+ digits'); return; }
    saveManagerPin(managerPin);
    setManagerPinMsg('✅ Manager PIN updated');
    setTimeout(() => setManagerPinMsg(''), 3000);
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
              {icon:'⏳',val:pendingCount,          label:'Pending Orders',   color:'#f59e0b'},
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

          {/* Table map */}
          <div style={card()}>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:'1.05rem',fontWeight:700,marginBottom:'0.9rem',color:'#1A0800'}}>🪑 Table Overview</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(75px,1fr))',gap:'0.5rem'}}>
              {tables.map(t=>{
                const color = t.status==='available'?'#10b981':t.status==='occupied'?'#f97316':'#ef4444';
                const bg    = t.status==='available'?'#d1fae5':t.status==='occupied'?'#fed7aa':'#fca5a5';
                const sessionMins = t.sessionStart?Math.floor((Date.now()-new Date(t.sessionStart).getTime())/60000):null;
                return (
                  <div key={t.id} style={{background:bg,border:`2px solid ${color}`,borderRadius:8,padding:'0.55rem',textAlign:'center'}}>
                    <div style={{fontWeight:800,fontSize:'0.88rem',color:'#1A0800'}}>T{t.id}</div>
                    <div style={{fontSize:'0.58rem',color:'#555',fontWeight:600,textTransform:'uppercase'}}>{t.status}</div>
                    {sessionMins!==null&&t.status==='occupied'&&<div style={{fontSize:'0.56rem',color:'#E65C00',fontWeight:700}}>{sessionMins}m</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* End of Day Report */}
          {(() => {
            const eod = getEndOfDayReport();
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
                {['all','pending','preparing','prepared','served','completed','cancelled'].map(s=>(
                  <button key={s} onClick={()=>setOrderFilter(s)} style={{...tabB(orderFilter===s),padding:'0.28rem 0.7rem',fontSize:'0.72rem',textTransform:'capitalize'}}>{s}</button>
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
                        const curIdx = STATUS_FLOW.indexOf(order.status as typeof STATUS_FLOW[number]);
                        const nxt    = curIdx !== -1 && curIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[curIdx + 1] : undefined;
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
                            <td style={{padding:'0.5rem 0.65rem',textAlign:'center'}}>{order.items?.length||0}</td>
                            <td style={{padding:'0.5rem 0.65rem'}}>₹{order.subtotal||order.total}</td>
                            <td style={{padding:'0.5rem 0.65rem',color:'#16a34a',fontWeight:700}}>{(order.discount||0)>0?`-₹${order.discount}`:'—'}</td>
                            <td style={{padding:'0.5rem 0.65rem',fontWeight:800}}>₹{order.total}</td>
                            <td style={{padding:'0.5rem 0.65rem',color:'#888'}}>{order.payment||'N/A'}</td>
                            <td style={{padding:'0.5rem 0.65rem'}}><span style={{fontSize:'0.7rem',fontWeight:700,padding:'0.12rem 0.45rem',borderRadius:10,background:(STATUS_COLOR[order.status]||'#888')+'22',color:STATUS_COLOR[order.status]||'#888',textTransform:'capitalize'}}>{order.status}</span></td>
                            <td style={{padding:'0.5rem 0.65rem',color:'#999',whiteSpace:'nowrap'}}>{t}</td>
                            <td style={{padding:'0.5rem 0.65rem',whiteSpace:'nowrap',display:'flex',gap:'0.25rem'}}>
                              {!isc&&nxt&&<button onClick={()=>advance(order.id)} style={{...btn('#f97316'),padding:'0.18rem 0.5rem',fontSize:'0.7rem'}}>▶{nxt}</button>}
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
            <button onClick={exportOrdersCSV} style={{...btn('#16a34a'),display:'flex',alignItems:'center',gap:'0.4rem'}}>📁 Export CSV</button>
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
            <div style={{display:'flex',gap:'0.5rem'}}>
              <button onClick={()=>{if(confirm('Reset all menu items to defaults?')){saveMenu([...DEFAULT_MENU]);refresh();}}} style={{...btn('#6b7280'),fontSize:'0.78rem'}}>↺ Reset</button>
              <button onClick={()=>setMenuModal({open:true,item:emptyItem(),isEdit:false})} style={{...btn(),display:'flex',alignItems:'center',gap:'0.35rem'}}><span style={{fontSize:'1.1rem',lineHeight:1}}>＋</span> Add Item</button>
            </div>
          </div>

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
                        <div style={{fontWeight:900,color:'#E65C00',fontSize:'1rem',whiteSpace:'nowrap'}}>₹{item.price}</div>
                      </div>
                      <div style={{fontSize:'0.73rem',color:'#888',marginBottom:'0.75rem',lineHeight:'1.4'}}>{item.desc}</div>
                      <div style={{display:'flex',gap:'0.35rem'}}>
                        <button onClick={()=>setMenuModal({open:true,item:{...item},isEdit:true})} style={{...btn('#3b82f6'),padding:'0.3rem 0.75rem',fontSize:'0.75rem',flex:1}}>✏️ Edit</button>
                        <button onClick={()=>{saveMenu(menu.map(m=>m.id===item.id?{...m,available:!m.available}:m));refresh();}} style={{...btn(item.available===false?'#16a34a':'#6b7280'),padding:'0.3rem 0.65rem',fontSize:'0.75rem'}}>{item.available===false?'✅':'⏸'}</button>
                        <button onClick={()=>{if(confirm(`Delete "${item.name}"?`)){saveMenu(menu.filter(m=>m.id!==item.id));refresh();}}} style={{...btn('#ef4444'),padding:'0.3rem 0.6rem',fontSize:'0.75rem'}}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
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

          {/* Fraud Alert Log */}
          {(() => {
            const fraudAlerts = getFraudAlerts().slice(0, 20);
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

          {/* Kitchen & Manager PINs */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1.5rem'}}>
            <div style={card('#3b82f6')}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>🔥 Kitchen PIN</h3>
              <p style={{fontSize:'0.78rem',color:'#666',marginBottom:'0.75rem'}}>Shared PIN used by all kitchen staff to log in at <code>/kitchen</code></p>
              <input
                value={kitchenPin}
                onChange={e=>setKitchenPin(e.target.value.replace(/\D/g,''))}
                maxLength={6} type="password" placeholder="••••"
                style={{...inp,letterSpacing:'0.4em',textAlign:'center',marginBottom:'0.5rem'}}
              />
              {kitchenPinMsg && <div style={{fontSize:'0.75rem',color:kitchenPinMsg.includes('✅')?'#16a34a':'#ef4444',marginBottom:'0.4rem'}}>{kitchenPinMsg}</div>}
              <button onClick={saveKitchenPinFn} style={{...btn('#3b82f6'),width:'100%'}}>💾 Save Kitchen PIN</button>
            </div>
            <div style={card('#16a34a')}>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:'1rem',fontWeight:700,marginBottom:'0.75rem',color:'#1A0800'}}>💳 Manager PIN</h3>
              <p style={{fontSize:'0.78rem',color:'#666',marginBottom:'0.75rem'}}>PIN used by managers to access counter billing at <code>/manager</code></p>
              <input
                value={managerPin}
                onChange={e=>setManagerPin(e.target.value.replace(/\D/g,''))}
                maxLength={6} type="password" placeholder="••••"
                style={{...inp,letterSpacing:'0.4em',textAlign:'center',marginBottom:'0.5rem'}}
              />
              {managerPinMsg && <div style={{fontSize:'0.75rem',color:managerPinMsg.includes('✅')?'#16a34a':'#ef4444',marginBottom:'0.4rem'}}>{managerPinMsg}</div>}
              <button onClick={saveManagerPinFn} style={{...btn('#16a34a'),width:'100%'}}>💾 Save Manager PIN</button>
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
                            {new Date(acc.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                          </td>
                          <td style={{padding:'0.55rem 0.75rem'}}>
                            <div style={{display:'flex',gap:'0.4rem',flexWrap:'wrap' as const}}>
                              <button
                                onClick={()=>{ toggleStaffAccount(acc.id); refresh(); }}
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
                                    <button onClick={()=>{ if(editPinVal.length>=4){updateStaffPin(acc.id,editPinVal);setEditPinId('');setEditPinVal('');refresh();} }} style={{...btn('#3b82f6'),fontSize:'0.72rem',padding:'0.25rem 0.5rem'}}>Save</button>
                                    <button onClick={()=>{setEditPinId('');setEditPinVal('');}} style={{...btn('#e5e7eb','#555'),fontSize:'0.72rem',padding:'0.25rem 0.5rem'}}>✕</button>
                                  </div>
                                : <button onClick={()=>{ setEditPinId(acc.id); setEditPinVal(''); }} style={{...btn('#374151'),fontSize:'0.72rem',padding:'0.25rem 0.6rem'}}>🔑 PIN</button>
                              }
                              <button
                                onClick={()=>{ if(confirm(`Delete account for ${acc.name}?`)){deleteStaffAccount(acc.id);refresh();} }}
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
                {href:'/kitchen/login',label:'🔥 Kitchen Login',   color:'#3b82f6'},
                {href:'/waiter/login', label:'🧑‍🍳 Waiter Login',   color:'#8b5cf6'},
                {href:'/manager/login',label:'💳 Manager Login',   color:'#16a34a'},
                {href:'/admin/login',  label:'🔧 Admin Login',     color:'#E65C00'},
                {href:'/online',       label:'📦 Online Ordering', color:'#06b6d4'},
                {href:'/',             label:'🪑 Dine-In Menu',    color:'#f59e0b'},
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
                    <div style={{width:9,height:9,borderRadius:'50%',background:STATUS_COLOR[ev.status]||'#888',marginTop:3,flexShrink:0}}/>
                    <div>
                      <span style={{fontWeight:700,textTransform:'capitalize',color:STATUS_COLOR[ev.status]||'#333',fontSize:'0.8rem'}}>{ev.status}</span>
                      {ev.by&&<span style={{color:'#888',fontSize:'0.73rem'}}> by {ev.by}</span>}
                      {ev.note&&<div style={{fontSize:'0.72rem',color:'#888',fontStyle:'italic'}}>{ev.note}</div>}
                      <div style={{fontSize:'0.7rem',color:'#bbb'}}>{new Date(ev.at || ev.timestamp || '').toLocaleTimeString()}</div>
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
                <label style={{fontSize:'0.76rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Price (₹) *</label>
                <input type="number" value={menuModal.item.price||''} onChange={e=>setMenuModal(m=>({...m,item:{...m.item,price:parseInt(e.target.value)||0}}))} placeholder="e.g. 280" min="1" style={{...inp}} />
              </div>
              <div style={{marginBottom:'1.1rem'}}>
                <label style={{fontSize:'0.76rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>Image URL</label>
                <input value={menuModal.item.img||''} onChange={e=>setMenuModal(m=>({...m,item:{...m.item,img:e.target.value}}))} placeholder="https://images.unsplash.com/…" style={{...inp}} />
                {menuModal.item.img && (
                  <div style={{width:'100%',height:'130px',borderRadius:8,overflow:'hidden',marginTop:'0.45rem',background:'#f5f0e8'}}>
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
        <div className="modal-overlay show" onClick={()=>{setShowPinMgr(false);setNewPin('');setNewPinMsg('');}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:350,padding:'1.75rem',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <h3 style={{fontFamily:"'Playfair Display',serif",marginBottom:'0.3rem',fontSize:'1.1rem'}}>🔑 Owner PIN</h3>
            <p style={{fontSize:'0.8rem',color:'#666',marginBottom:'0.9rem'}}>Used to authorise discounts. Current PIN: <strong>{getPin()}</strong></p>
            <label style={{fontSize:'0.75rem',fontWeight:700,color:'#555',display:'block',marginBottom:'0.28rem'}}>New 4-digit PIN</label>
            <input type="password" value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="••••" maxLength={4} style={{...inp,letterSpacing:'0.35em',textAlign:'center' as const,marginBottom:'0.25rem'}} />
            {newPinMsg && <div style={{fontSize:'0.76rem',color:newPinMsg.includes('✓')?'#16a34a':'#ef4444',marginBottom:'0.5rem'}}>{newPinMsg}</div>}
            <button onClick={()=>{if(!/^\d{4}$/.test(newPin)){setNewPinMsg('❌ Must be exactly 4 digits');return;}savePin(newPin);setNewPinMsg('✓ PIN updated!');setTimeout(()=>{setShowPinMgr(false);setNewPin('');setNewPinMsg('');},1500);}} style={{...btn(),width:'100%',marginTop:'0.5rem'}}>Save PIN</button>
          </div>
        </div>
      )}

    </div>
  );
}
