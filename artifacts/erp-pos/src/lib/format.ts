import { format as dateFnsFormat } from "date-fns";

/**
 * Format a number as Indian Rupees (₹) with Indian number grouping (lakhs/crores).
 * e.g. 100000 → ₹1,00,000.00
 */
export function formatINR(amount: number | undefined | null): string {
  if (amount == null) return "₹0.00";
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Format date as dd/MM/yyyy (Indian standard)
 */
export function formatDate(dateStr: string | Date): string {
  return dateFnsFormat(new Date(dateStr), "dd/MM/yyyy");
}

/**
 * Format date-time as dd/MM/yyyy HH:mm
 */
export function formatDateTime(dateStr: string | Date): string {
  return dateFnsFormat(new Date(dateStr), "dd/MM/yyyy HH:mm");
}

/**
 * Format date-time fully for invoice display
 */
export function formatDateTimeFull(dateStr: string | Date): string {
  return dateFnsFormat(new Date(dateStr), "dd MMM yyyy, hh:mm a");
}
