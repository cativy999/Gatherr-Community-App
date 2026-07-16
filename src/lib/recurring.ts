/**
 * Shared helpers for recurring event display.
 * Handles both legacy single-day (recurring_day) and new multi-day (recurring_days)
 * plus optional nth-week-of-month (recurring_week_of_month).
 */

export interface RecurringFields {
  is_recurring?: boolean | null;
  recurring_days?: string[] | null;
  recurring_day?: string | null;
  recurring_week_of_month?: number | null;
}

const SHORT: Record<string, string> = {
  Sunday: "Sun", Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat",
};

/** Returns the array of recurring days, backward-compatible with legacy recurring_day. */
export function getRecurringDays(event: RecurringFields): string[] {
  if (event.recurring_days && event.recurring_days.length > 0) return event.recurring_days;
  if (event.recurring_day) return [event.recurring_day];
  return [];
}

/**
 * Returns a human-readable label for a recurring event.
 * Examples:
 *   "Every Wednesday"
 *   "Every Mon & Wed"
 *   "4th Thursday of the month"
 */
export function getRecurringLabel(event: RecurringFields): string {
  const days = getRecurringDays(event);
  if (!days.length) return "Recurring";

  const daysStr =
    days.length === 1
      ? days[0]
      : days.map((d) => SHORT[d] ?? d).join(" & ");

  const week = event.recurring_week_of_month;
  if (!week) return `Every ${daysStr}`;

  const nth = ["", "1st", "2nd", "3rd", "4th"][week] ?? `${week}th`;
  return `${nth} ${daysStr} of the month`;
}
