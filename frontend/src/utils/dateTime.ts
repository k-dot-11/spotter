/**
 * Utilities for formatting dates and times for HTML5 datetime-local inputs and APIs.
 */

/**
 * Returns the current local date and time formatted as `YYYY-MM-DDTHH:mm`.
 * Suitable for direct binding to HTML5 `<input type="datetime-local" />`.
 */
export const getCurrentLocalDateTimeString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Normalizes any date string (ISO UTC, partial, or Date object) to a valid `YYYY-MM-DDTHH:mm`
 * string in the user's local timezone.
 * Falls back to current local datetime if value is empty or invalid.
 */
export const toDateTimeLocalValue = (val?: string | Date): string => {
  if (!val) return getCurrentLocalDateTimeString();
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return getCurrentLocalDateTimeString();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
