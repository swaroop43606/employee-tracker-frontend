/**
 * Date and Timezone Utilities
 * Ensures all user-facing dates use local browser calendar day without UTC shift issues.
 */

/**
 * Returns user's local date as 'YYYY-MM-DD' string.
 * Avoids UTC ISO truncation (new Date().toISOString().split('T')[0]) which can
 * return the wrong day in timezones with positive or negative offsets.
 */
export const getLocalDate = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date string or Date object into a readable localized format.
 * Handles 'YYYY-MM-DD' strings by preserving the exact local calendar date.
 */
export const formatDate = (
  dateVal: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string => {
  if (!dateVal) return 'N/A';
  if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    const [y, m, d] = dateVal.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', options);
  }
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', options);
};

/**
 * Formats a date and time string into a readable format (e.g., 'Oct 15, 2026, 3:30 PM').
 */
export const formatDateTime = (dateVal: string | Date | null | undefined): string => {
  if (!dateVal) return 'N/A';
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  return isNaN(d.getTime())
    ? 'N/A'
    : d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
};

/**
 * Formats numeric hours (e.g., 7.5 -> '7.5h').
 */
export const formatHours = (hours: number | null | undefined): string => {
  const h = Number(hours) || 0;
  return `${h.toFixed(1)}h`;
};
