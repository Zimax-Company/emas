// Formatting shared by server and client components. A fixed time zone keeps
// server-rendered and hydrated output identical.
const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || 'Africa/Lagos'

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
  return new Date(value).toLocaleString('en-GB', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export const FREQUENCY_LABELS: Record<string, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}
