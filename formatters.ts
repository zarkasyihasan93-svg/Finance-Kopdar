export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function sanitizeNumericInput(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
}

export function formatNumericInput(value: string): string {
  const digits = sanitizeNumericInput(value);
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(digits));
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    if (!dateStr.includes('T') && !dateStr.includes(':')) {
      return formatDate(dateStr);
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatBankTimestamp(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);

    if (dateStr.includes('T') || dateStr.includes(':')) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${dateFormatted} • ${hours}:${minutes} WIB`;
    }
    return `${dateFormatted} • 12:00 WIB`;
  } catch {
    return dateStr;
  }
}

export function formatMonthYear(monthStr: string): string {
  if (!monthStr) return '-';
  try {
    const [year, month] = monthStr.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return monthStr;
  }
}
