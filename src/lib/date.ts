/**
 * Returns today's date as YYYY-MM-DD in New Zealand time
 */
export function getNZDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Returns a friendly display date, e.g. "Saturday, 19 September 2026"
 */
export function getNZDisplayDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}