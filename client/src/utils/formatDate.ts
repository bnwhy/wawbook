/**
 * Format a date to DD/MM/YYYY (French format)
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a date with time to DD/MM/YYYY HH:mm
 * @param date - Date object, ISO string, or timestamp
 * @returns Formatted date/time string
 */
export function formatDateTime(date: Date | string | number): string {
  const d = new Date(date);
  const dateStr = formatDate(d);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}
