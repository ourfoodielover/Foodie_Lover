// ─── Foodie Lover — Test Data Reset Server Helpers ─────────────────────────────
// Server-only utilities for the pre-production "Reset Test Data" Admin
// feature (Danger Zone). This is a pure ADDITION — it does not modify any
// existing file. See supabase/migration_024_reset_test_data.sql for the
// database side (test_data_resets table, preview_test_data_reset() and
// execute_test_data_reset() SECURITY DEFINER functions).
//
// WHY THIS EXISTS: before a restaurant goes live, an Admin needs a safe way
// to wipe every dummy/test order, tab, Finance transaction, vendor/salary
// payment, and Daily Closing snapshot WITHOUT touching menu items, staff
// accounts, PIN configuration, Finance accounts/categories, vendors, salary
// config, or Spin & Win configuration. This file provides the one snapshot
// function (getTestDataResetSnapshot) used for BOTH the pre-reset preview
// and the post-reset verification, so "what will be removed" and "confirm
// it's gone" are guaranteed to be counting the exact same things.
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeSystemSales,
  sumSystemSales,
  matchAccountForKeyword,
  parsePaymentSplits,
  type FinanceAccountRow,
} from '@/lib/finance-server';

const EPOCH = '1970-01-01T00:00:00.000Z';

export interface TestDataResetCounts {
  orders:              number;
  customerTabs:        number;
  orderItems:          number;
  orderEvents:         number;
  orderIssues:         number;
  orderFeedback:       number;
  printJobs:           number;
  emailQueue:          number;
  emailLog:            number;
  waiterCalls:         number;
  tabDevices:          number;
  splitBills:          number;
  spinResults:         number;
  rewardCoupons:       number;
  shiftLogs:           number;
  managerExpenses:     number;
  financeTransactions: number;
  financeAuditLog:     number;
  vendorPayments:      number;
  vendorPurchases:     number;
  salaryPayments:      number;
  dailyClosings:       number;
  occupiedTables:      number;
}

export interface TestDataResetAmounts {
  systemSalesGross:    number;
  systemSalesDiscount: number;
  systemSalesNet:      number;
  managerExpenses:     number;
  financeIncome:       number;
  financeExpense:      number;
  vendorPaid:          number;
  salaryPaid:          number;
  netCashFlow:         number;
}

export interface AccountBalancePreview {
  accountId:      string;
  name:           string;
  openingBalance: number;
  currentBalance: number;
}

export interface TestDataResetSnapshot {
  counts:          TestDataResetCounts;
  amounts:         TestDataResetAmounts;
  accountBalances: AccountBalancePreview[];
  /** true only when every count is 0, every amount is 0, no table is
   *  occupied, and every account's current balance equals its opening
   *  balance — i.e. a full "clean slate" state. */
  isClean:         boolean;
}

/**
 * Computes current account balances the same way components/AdminFinance.tsx
 * does client-side (opening_balance + system-sales rows auto-matched by
 * payment-method keyword + manual finance_transactions posted against the
 * account) — reused here server-side so the reset preview/verification can
 * report "your Cash Drawer currently shows ₹X, and will return to its ₹Y
 * opening balance" without a second, drifting implementation of the match
 * logic. After a successful reset, systemSales and finance_transactions are
 * both empty, so every account's currentBalance trivially equals its
 * openingBalance — this function still recomputes for real rather than
 * assuming that, so a caller with stray data left behind (e.g. a skipped
 * step) is not falsely told the books are clean.
 */
async function computeAccountBalances(
  sb: SupabaseClient,
  restaurantId: string,
): Promise<AccountBalancePreview[]> {
  const { data: accountRows } = await sb
    .from('finance_accounts')
    .select('id, name, type, opening_balance, payment_method_keywords, is_default, is_active')
    .eq('restaurant_id', restaurantId);
  const accounts = (accountRows ?? []) as unknown as (FinanceAccountRow & { opening_balance: number })[];
  if (accounts.length === 0) return [];

  const salesRows = await computeSystemSales(sb, restaurantId, EPOCH, new Date().toISOString());

  const { data: txRows } = await sb
    .from('finance_transactions')
    .select('type, amount, account_id, transfer_to_account_id')
    .eq('restaurant_id', restaurantId)
    .eq('is_voided', false);

  const balances = new Map<string, number>();
  for (const a of accounts) balances.set(a.id, Number(a.opening_balance) || 0);

  for (const row of salesRows) {
    const parts = parsePaymentSplits(row.paymentMethod, row.net);
    for (const part of parts) {
      const acct = matchAccountForKeyword(part.keyword, accounts);
      if (acct) balances.set(acct.id, (balances.get(acct.id) ?? 0) + part.amount);
    }
  }

  for (const t of (txRows ?? [])) {
    const amt = Number(t.amount) || 0;
    const accountId = t.account_id as string;
    if (t.type === 'income') {
      balances.set(accountId, (balances.get(accountId) ?? 0) + amt);
    } else if (t.type === 'expense') {
      balances.set(accountId, (balances.get(accountId) ?? 0) - amt);
    } else if (t.type === 'transfer') {
      balances.set(accountId, (balances.get(accountId) ?? 0) - amt);
      const toId = t.transfer_to_account_id as string | null;
      if (toId) balances.set(toId, (balances.get(toId) ?? 0) + amt);
    }
    // 'adjustment' rows are excluded here, matching AdminFinance.tsx's own
    // balance reducer (adjustments are informational, not a cash movement).
  }

  return accounts.map(a => ({
    accountId:      a.id,
    name:           a.name,
    openingBalance: Number(a.opening_balance) || 0,
    currentBalance: Math.round((balances.get(a.id) ?? 0) * 100) / 100,
  }));
}

/**
 * The one snapshot function used for both the pre-reset Admin preview and
 * the post-reset verification summary. Calls the read-only
 * preview_test_data_reset() Postgres function (migration_024) for the bulk
 * counts/amounts, and separately recomputes account balances in TypeScript
 * (see computeAccountBalances above) since that logic isn't in SQL.
 */
export async function getTestDataResetSnapshot(
  sb: SupabaseClient,
  restaurantId: string,
): Promise<TestDataResetSnapshot> {
  const { data, error } = await sb.rpc('preview_test_data_reset', { p_restaurant_id: restaurantId });
  if (error) throw error;

  const result = data as { counts: TestDataResetCounts; amounts: TestDataResetAmounts };
  const accountBalances = await computeAccountBalances(sb, restaurantId);

  const counts  = result.counts;
  const amounts = result.amounts;
  const countsClean  = Object.values(counts).every(n => Number(n) === 0);
  const amountsClean = amounts.systemSalesNet === 0 && amounts.managerExpenses === 0 &&
    amounts.financeIncome === 0 && amounts.financeExpense === 0 &&
    amounts.vendorPaid === 0 && amounts.salaryPaid === 0;
  const balancesClean = accountBalances.every(a => Math.abs(a.currentBalance - a.openingBalance) < 0.01);

  return {
    counts,
    amounts,
    accountBalances,
    isClean: countsClean && amountsClean && balancesClean,
  };
}

/**
 * Also re-verifies System Sales through the same authoritative TS engine
 * every other screen (Finance/Manager/Admin) uses (computeSystemSales /
 * sumSystemSales, lib/finance-server.ts), as a cross-check against the raw
 * SQL sum inside preview_test_data_reset(). The two are expected to always
 * agree — this exists purely as a belt-and-braces consistency check the
 * reset route can surface if they ever don't, rather than silently trusting
 * one implementation.
 */
export async function crossCheckSystemSalesNet(
  sb: SupabaseClient,
  restaurantId: string,
): Promise<number> {
  const rows = await computeSystemSales(sb, restaurantId, EPOCH, new Date().toISOString());
  return sumSystemSales(rows).net;
}
