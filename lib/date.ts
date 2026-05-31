// ─── Foodie Lover — IST Date Utilities ──────────────────────────────────────
// ALL date/time display in this app must go through these helpers.
//
// Why: Vercel serverless runs in UTC. Without an explicit timeZone every
// toLocaleString / toLocaleDateString / toLocaleTimeString call returns UTC
// time — emails show wrong times, analytics buckets are offset, "today"
// comparisons split across midnight incorrectly.
//
// IST = Asia/Kolkata = UTC +05:30

export const TZ     = 'Asia/Kolkata' as const;
export const LOCALE = 'en-IN'        as const;

// ─── Display formatters ───────────────────────────────────────────────────────

/** "15 Jan 2025" */
export function fmtDateLong(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso as string).toLocaleDateString(LOCALE, {
    timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** "15/01/2025" */
export function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso as string).toLocaleDateString(LOCALE, {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/** "05:30 PM" */
export function fmtTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso as string).toLocaleTimeString(LOCALE, {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/** "15 Jan 2025, 05:30 PM" */
export function fmtDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso as string).toLocaleString(LOCALE, {
    timeZone: TZ, dateStyle: 'medium', timeStyle: 'short',
  });
}

/** "15/01/25, 05:30 PM" */
export function fmtDateTimeShort(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso as string).toLocaleString(LOCALE, {
    timeZone: TZ, dateStyle: 'short', timeStyle: 'short',
  });
}

/** "Jan 2025" — for monthly chart buckets */
export function fmtMonthYear(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso as string).toLocaleDateString(LOCALE, {
    timeZone: TZ, month: 'short', year: 'numeric',
  });
}

// ─── "Today" helpers ──────────────────────────────────────────────────────────

/** "YYYY-MM-DD" for a date in IST — used for grouping/comparison */
export function toISTDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  // en-CA locale produces "YYYY-MM-DD" format
  return new Date(d as string).toLocaleDateString('en-CA', { timeZone: TZ });
}

/** "YYYY-MM-DD" for today in IST */
export function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

/** true when the ISO string falls on today in IST */
export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return toISTDate(iso) === todayIST();
}

/**
 * IST midnight today as a UTC ISO string.
 * Use this for Supabase range queries: "give me rows from today".
 *
 *   const since = todayMidnightIST().toISOString();
 *   .gte('created_at', since)
 */
export function todayMidnightIST(): Date {
  const d = todayIST(); // "YYYY-MM-DD"
  return new Date(`${d}T00:00:00+05:30`);
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

/**
 * IST hour (0–23) for a timestamp.
 * Use this instead of new Date(iso).getHours() which returns UTC hour on server.
 */
export function getISTHour(iso: string | null | undefined): number {
  if (!iso) return 0;
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ, hour: 'numeric', hour12: false,
  }).formatToParts(new Date(iso));
  const h = parts.find(p => p.type === 'hour');
  return h ? parseInt(h.value, 10) % 24 : 0;
}

/**
 * IST week-of-month for a timestamp ("Week 1" … "Week 5").
 * Use instead of Math.ceil(new Date(iso).getDate() / 7).
 */
export function getISTWeekLabel(iso: string | null | undefined): string {
  if (!iso) return 'Week 1';
  const dayParts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TZ, day: 'numeric',
  }).formatToParts(new Date(iso));
  const day = parseInt(dayParts.find(p => p.type === 'day')?.value ?? '1', 10);
  return `Week ${Math.ceil(day / 7)}`;
}

// ─── Clock tick helper ────────────────────────────────────────────────────────

/** Call inside a setInterval(1000) tick — returns { date, time } in IST */
export function clockIST(): { date: string; time: string } {
  const now = new Date();
  return {
    date: now.toLocaleDateString(LOCALE, {
      timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
    }),
    time: now.toLocaleTimeString(LOCALE, { timeZone: TZ }),
  };
}
