/** Amounts are stored in minor units (kobo/cents). */
export function money(minor: number | null | undefined, currency = 'NGN') {
  if (minor === null || minor === undefined) return '—'
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(minor / 100)
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`
  }
}

export function toMinor(major: string | number) {
  const n = typeof major === 'number' ? major : Number(String(major).replace(/,/g, ''))
  return Math.round(n * 100)
}

export function date(value: string | Date | null | undefined, withTime = false) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleString('en-GB', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
}

export const FREQUENCY_LABELS: Record<string, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}
