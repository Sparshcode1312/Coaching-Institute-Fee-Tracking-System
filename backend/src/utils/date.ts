/**
 * Date & Time Policy Utility
 * Timezone: Asia/Kolkata (IST = UTC+5:30)
 * All financial due date and overdue day calculations strictly adhere to Asia/Kolkata local calendar days.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current date in Asia/Kolkata timezone as an ISO date string (YYYY-MM-DD).
 */
export const getTodayKolkata = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // Formats as YYYY-MM-DD
};

/**
 * Returns current timestamp in Asia/Kolkata as an ISO-8601 string.
 */
export const getNowKolkataISO = (): string => {
  return new Date().toISOString();
};

/**
 * Parses a YYYY-MM-DD string into a Date representing UTC midnight for consistent arithmetic.
 */
export const parseDateOnly = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date string: ${dateStr}. Expected YYYY-MM-DD.`);
  }
  return new Date(Date.UTC(year, month - 1, day));
};

/**
 * Calculates calendar day difference (dateA - dateB) in days.
 * A positive result means dateA is after dateB.
 */
export const diffCalendarDays = (dateStrA: string, dateStrB: string): number => {
  const dateA = parseDateOnly(dateStrA);
  const dateB = parseDateOnly(dateStrB);
  const diffMs = dateA.getTime() - dateB.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Calculates overdue days for an instalment in Asia/Kolkata.
 * Rule: Overdue days = Current date - Due date, ONLY when instalment has an outstanding amount (> 0).
 * If outstanding is 0, overdue days is always 0.
 * If current date <= due date, overdue days is 0.
 */
export const calculateOverdueDays = (
  dueDateStr: string,
  outstandingPaise: number | bigint,
  currentDateStr: string = getTodayKolkata()
): number => {
  if (BigInt(outstandingPaise) <= 0n) {
    return 0;
  }
  const daysPastDue = diffCalendarDays(currentDateStr, dueDateStr);
  return Math.max(0, daysPastDue);
};

export type DueStatus = 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE' | 'SETTLED';

/**
 * Evaluates the Due Status of an instalment based on Asia/Kolkata calendar:
 * - SETTLED: Outstanding amount is 0
 * - DUE_TODAY: Outstanding > 0 and dueDate == today
 * - OVERDUE: Outstanding > 0 and dueDate < today
 * - UPCOMING: Outstanding > 0 and dueDate > today
 */
export const evaluateDueStatus = (
  dueDateStr: string,
  outstandingPaise: number | bigint,
  currentDateStr: string = getTodayKolkata()
): DueStatus => {
  if (BigInt(outstandingPaise) <= 0n) {
    return 'SETTLED';
  }

  const dayDiff = diffCalendarDays(dueDateStr, currentDateStr);

  if (dayDiff === 0) {
    return 'DUE_TODAY';
  } else if (dayDiff < 0) {
    return 'OVERDUE';
  } else {
    return 'UPCOMING';
  }
};

