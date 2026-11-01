import type { Metadata } from 'next'
import Link from 'next/link'
import { GET } from '@/app/api/estates/[eid]/residences/route'
import { can, getEstate, load, param, type SearchParams } from '@/lib/server'
import { money } from '@/lib/format'
import type { ResidenceRow } from '@/lib/types'
import { AddResidence } from './add-residence'

export const metadata: Metadata = { title: 'Residences' }

export default async function ResidencesPage({ params, searchParams }: { params: Promise<{ eid: string }>; searchParams: SearchParams }) {
  const { eid } = await params
  const q = await param(searchParams, 'q')
  const [e, residences] = await Promise.all([getEstate(eid), load<ResidenceRow[], { eid: string }>(GET, { eid }, { q })])
  const base = `/estates/${eid}`

  return (
    <div className="stack">
      <AddResidence eid={eid} canManage={can(e, 'residences.manage')}>
        <div>
          <h1>{can(e, 'residences.view') ? 'Residences' : 'My residence'}</h1>
          <p className="muted">{residences.length} residence(s)</p>
        </div>
      </AddResidence>

      <div className="card">
        {can(e, 'residences.view') && (
          <form className="card-head" method="get">
            <input name="q" defaultValue={q} placeholder="Search name or address" style={{ maxWidth: 320 }} />
          </form>
        )}
        <div className="table-wrap">
          {residences.length ? (
            <table>
              <thead>
                <tr><th>Residence</th><th>Address</th><th>Primary contact</th><th className="num">Balance owed</th></tr>
              </thead>
              <tbody>
                {residences.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`${base}/residences/${r.id}`}>{r.name}</Link></td>
                    <td>{r.address_line1}{r.city && <span className="muted">, {r.city}</span>}</td>
                    <td>
                      {r.primary_contact_name ?? '—'}
                      {r.primary_contact_phone && <div className="small muted">{r.primary_contact_phone}</div>}
                    </td>
                    <td className={`num ${(r.balance ?? 0) > 0 ? 'neg' : ''}`}>{r.balance === null ? '—' : money(r.balance, e.estate.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No residences yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
