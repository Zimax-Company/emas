import type { Metadata } from 'next'
import Link from 'next/link'
import { GET as getVisitors } from '@/app/api/estates/[eid]/visitors/route'
import { can, getEstate, load, param, type SearchParams } from '@/lib/server'
import { date } from '@/lib/format'
import type { VisitorPass } from '@/lib/types'
import { Forbidden } from '@/components/Forbidden'
import { VisitorStatus } from '@/components/VisitorStatus'
import { ValidateCode } from './view'

export const metadata: Metadata = { title: 'Gate' }

const FILTERS = [['expected', 'Expected'], ['inside', 'Inside now'], ['recent', 'Recent activity']] as const

export default async function GatePage({ params, searchParams }: { params: Promise<{ eid: string }>; searchParams: SearchParams }) {
  const { eid } = await params
  const e = await getEstate(eid)
  const canValidate = can(e, 'visitors.validate')
  if (!canValidate && !can(e, 'visitors.view')) return <Forbidden />
  const requested = await param(searchParams, 'status')
  const status = FILTERS.some(([key]) => key === requested) ? requested! : 'expected'
  const passes = await load<VisitorPass[], { eid: string }>(getVisitors, { eid }, { status })
  const base = `/estates/${eid}/gate`

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Gate</h1>
          <p className="muted">Visitors enter with their IN code and leave with their OUT code. Each code works once.</p>
        </div>
      </div>

      {canValidate && <ValidateCode eid={eid} />}

      <div className="card">
        <nav className="tabs card-head" style={{ marginBottom: 0, justifyContent: 'flex-start', paddingBottom: 0 }}>
          {FILTERS.map(([key, label]) => (
            <Link key={key} href={`${base}?status=${key}`} className={status === key ? 'active' : undefined}>{label}</Link>
          ))}
        </nav>
        <div className="table-wrap">
          {passes.length ? (
            <table>
              <thead><tr><th>Visitor</th><th>Residence</th><th>Valid</th><th>Status</th><th>Gate</th></tr></thead>
              <tbody>
                {passes.map((p) => (
                  <tr key={p.id}>
                    <td>{p.visitor_name}<div className="small muted">{[p.visitor_phone, p.purpose].filter(Boolean).join(' · ') || '—'}</div></td>
                    <td>
                      <Link href={`/estates/${eid}/residences/${p.residence_id}?tab=visitors`}>{p.residence_name}</Link>
                      {p.created_by_name && <div className="small muted">by {p.created_by_name}</div>}
                    </td>
                    <td className="small">{date(p.valid_from, true)}<div className="muted">to {date(p.expires_at, true)}</div></td>
                    <td><VisitorStatus status={p.status} /></td>
                    <td className="small">
                      {p.checked_in_at ? <>In {date(p.checked_in_at, true)}{p.checked_in_by_name && <span className="muted"> · {p.checked_in_by_name}</span>}</> : '—'}
                      {p.checked_out_at && <div>Out {date(p.checked_out_at, true)}{p.checked_out_by_name && <span className="muted"> · {p.checked_out_by_name}</span>}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">{status === 'inside' ? 'No visitors inside.' : status === 'expected' ? 'No visitors expected.' : 'No visitor activity yet.'}</div>
          )}
        </div>
      </div>
    </div>
  )
}
