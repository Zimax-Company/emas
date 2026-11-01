import type { Metadata } from 'next'
import Link from 'next/link'
import { GET } from '@/app/api/estates/[eid]/account/route'
import { can, getEstate, load, param, type SearchParams } from '@/lib/server'
import { date, money } from '@/lib/format'
import type { EstateAccount } from '@/lib/types'
import { Forbidden } from '@/components/Forbidden'
import { DeleteTx, RecordTx } from './view'

export const metadata: Metadata = { title: 'Estate account' }

export default async function AccountPage({ params, searchParams }: { params: Promise<{ eid: string }>; searchParams: SearchParams }) {
  const { eid } = await params
  const e = await getEstate(eid)
  if (!can(e, 'estate_accounts.view')) return <Forbidden />
  const filters = { type: await param(searchParams, 'type'), from: await param(searchParams, 'from'), to: await param(searchParams, 'to') }
  const acct = await load<EstateAccount, { eid: string }>(GET, { eid }, filters)
  const m = (v: number) => money(v, e.estate.currency)
  const filtered = filters.from || filters.to ? ' (filtered)' : ''
  const manage = can(e, 'estate_accounts.manage')

  return (
    <div className="stack">
      <RecordTx eid={eid} currency={e.estate.currency} canManage={manage} />

      <div className="grid">
        <div className="card stat"><div className="label">Balance (all time)</div><div className={`value ${acct.balance < 0 ? 'neg' : ''}`}>{m(acct.balance)}</div></div>
        <div className="card stat"><div className="label">Income{filtered}</div><div className="value pos">{m(acct.summary.income)}</div></div>
        <div className="card stat"><div className="label">Expenses{filtered}</div><div className="value neg">{m(acct.summary.expenses)}</div></div>
        <div className="card stat"><div className="label">Net</div><div className="value">{m(acct.summary.net)}</div></div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)' }}>
        <div className="card">
          <form className="card-head" method="get">
            <div className="row">
              <select name="type" defaultValue={filters.type ?? ''} style={{ width: 'auto' }}>
                <option value="">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expenses</option>
              </select>
              <input name="from" type="date" defaultValue={filters.from} style={{ width: 'auto' }} aria-label="From" />
              <input name="to" type="date" defaultValue={filters.to} style={{ width: 'auto' }} aria-label="To" />
              <button className="btn sm">Filter</button>
            </div>
          </form>
          <div className="table-wrap">
            {acct.transactions.length ? (
              <table>
                <thead><tr><th>Date</th><th>Category</th><th>Description</th><th className="num">Amount</th><th /></tr></thead>
                <tbody>
                  {acct.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="muted">{date(t.occurred_at)}</td>
                      <td>{t.category}</td>
                      <td>
                        {t.residence_id ? (
                          <Link href={`/estates/${eid}/residences/${t.residence_id}?tab=account`}>{t.description}</Link>
                        ) : (
                          t.description || '—'
                        )}
                        {t.reference && <div className="small muted">Ref {t.reference}</div>}
                      </td>
                      <td className={`num ${t.type === 'income' ? 'pos' : 'neg'}`}>{t.type === 'income' ? '+' : '−'}{m(t.amount)}</td>
                      <td>{manage && !t.residence_id && <DeleteTx eid={eid} id={t.id} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">No transactions.</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>By category</h2></div>
          {acct.by_category.length ? (
            <table>
              <tbody>
                {acct.by_category.map((c) => (
                  <tr key={c.type + c.category}>
                    <td>{c.category}<div className="small muted">{c.type}</div></td>
                    <td className={`num ${c.type === 'income' ? 'pos' : 'neg'}`}>{m(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">Nothing yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
