/**
 * Money is stored as integer kobo in the database.
 * 100 kobo = ₦1
 */

export function formatNaira(kobo: number, options?: { compact?: boolean }): string {
  const naira = kobo / 100;
  if (options?.compact) {
    if (Math.abs(naira) >= 1_000_000) {
      return `₦${(naira / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(naira) >= 1_000) {
      return `₦${(naira / 1_000).toFixed(1)}k`;
    }
  }
  return `₦${naira.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function nairaToKobo(naira: number | string): number {
  const n = typeof naira === "string" ? parseFloat(naira) : naira;
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}
