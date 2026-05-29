/**
 * Formatting utilities for NK Enterprises ERP
 * Indian currency, dates, number-to-words
 */

/** Format a number as Indian Rupees: ₹1,23,456.00 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  const [intPart, decPart] = abs.toFixed(2).split('.');

  // Indian number system grouping: last 3, then groups of 2
  let formatted = '';
  const digits = intPart;
  if (digits.length <= 3) {
    formatted = digits;
  } else {
    formatted = digits.slice(-3);
    let remaining = digits.slice(0, -3);
    while (remaining.length > 2) {
      formatted = remaining.slice(-2) + ',' + formatted;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) {
      formatted = remaining + ',' + formatted;
    }
  }

  return `${isNeg ? '-' : ''}₹${formatted}.${decPart}`;
}

/** Short format: ₹1.2L, ₹45.3K */
export function formatCurrencyShort(amount: number): string {
  if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

/** Format date: DD/MM/YYYY */
export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

/** Format datetime: DD/MM/YYYY hh:mm AM/PM */
export function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    let h = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${dd}/${mm}/${yyyy} ${h}:${min} ${ampm}`;
  } catch {
    return dateStr;
  }
}

/** Format relative time: "2 hours ago", "just now" */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(dateStr);
}

/** Convert number to words (Indian system) */
export function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function twoDigits(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  }

  function threeDigits(num: number): string {
    if (num >= 100) {
      return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + twoDigits(num % 100) : '');
    }
    return twoDigits(num);
  }

  const intPart = Math.floor(Math.abs(n));
  const decPart = Math.round((Math.abs(n) - intPart) * 100);

  let result = '';
  if (intPart >= 10000000) {
    result += threeDigits(Math.floor(intPart / 10000000)) + ' Crore ';
  }
  if (intPart >= 100000) {
    result += twoDigits(Math.floor((intPart % 10000000) / 100000)) + ' Lakh ';
  }
  if (intPart >= 1000) {
    result += twoDigits(Math.floor((intPart % 100000) / 1000)) + ' Thousand ';
  }
  if (intPart >= 100 || intPart > 0) {
    result += threeDigits(intPart % 1000);
  }

  result = result.trim();
  if (decPart > 0) {
    result += ` and ${twoDigits(decPart)} Paise`;
  }

  return (n < 0 ? 'Minus ' : '') + 'Rupees ' + result + ' Only';
}

/** Generate unique invoice number: NK-250528-1234 */
export function generateInvoiceNumber(prefix: string = 'NK'): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${y}${m}${d}-${r}`;
}

/** Get greeting based on time of day */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Truncate text with ellipsis */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}
