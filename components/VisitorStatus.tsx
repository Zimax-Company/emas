import type { VisitorPassStatus } from '@/lib/types'

const STYLES: Record<VisitorPassStatus, [string, string]> = {
  active: ['primary', 'Expected'],
  upcoming: ['', 'Upcoming'],
  inside: ['success', 'Inside'],
  completed: ['', 'Left'],
  expired: ['warning', 'Expired'],
  cancelled: ['danger', 'Cancelled'],
}

export function VisitorStatus({ status }: { status: VisitorPassStatus }) {
  const [tone, label] = STYLES[status]
  return <span className={`badge ${tone}`}>{label}</span>
}
