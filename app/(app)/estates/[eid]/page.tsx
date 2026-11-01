import Link from 'next/link'
import { GET } from '@/app/api/estates/[eid]/dashboard/route'
import { getEstate, load } from '@/lib/server'
import { date, FREQUENCY_LABELS, money } from '@/lib/format'
import type { Dashboard } from '@/lib/types'

type P = { params: Promise<{ eid: string }> }

export async function generateMetadata({ params }: P) {
  const { eid } = await params
  return { title: (await getEstate(eid)).estate.name }
}

export default async function DashboardPage({ params }: P) {
  const { eid } = await params
  const d = await load<Dashboard, { eid: string }>(GET, { eid })
  const base = `/estates/${eid}`
  const m = (v: number | undefined) => money(v, d.estate.currency)
  const linkCard = { color: 'inherit', textDecoration: 'none' }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{d.estate.name}</h1>
          <p className="muted">Estate dashboard</p>
        </div>
      </div>

      {!!d.my_residences?.length && (
        <section className="stack">
          <h2>My residence</h2>
          <div className="grid">
            {d.my_residences.map((r) => (
              <Link key={r.id} href={`${base}/residences/${r.id}`} className="card card-body" style={linkCard}>
                <div className="row between">
                  <h3>{r.name}</h3>
                  {r.unread_count > 0 && <span className="badge primary">{r.unread_count} unread</span>}
                </div>
                <p className="muted small">{r.address_line1}</p>
                <p style={{ marginTop: 10 }}>
                  <span className="muted small">Balance owed</span>
                  <br />
                  <b className={r.account.balance > 0 ? 'neg' : 'pos'}>{m(r.account.balance)}</b>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(d.residence_count !== undefined || d.finance || d.receivables) && (
        <div className="grid">
          {d.residence_count !== undefined && <Stat label="Residences" value={d.residence_count} />}
          {d.member_count !== undefined && <Stat label="Members" value={d.member_count} />}
          {d.finance && (
            <>
              <Stat label="Estate balance" value={m(d.finance.balance)} className={d.finance.balance < 0 ? 'neg' : ''} />
              <Stat label="Income this month" value={m(d.finance.this_month.income)} className="pos" />
              <Stat label="Expenses this month" value={m(d.finance.this_month.expenses)} className="neg" />
            </>
          )}
          {d.receivables && (
            <Stat label="Outstanding dues" value={m(d.receivables.outstanding_total)} note={`${d.receivables.residences_owing} residence(s) owing`} />
          )}
        </div>
      )}

      <div className="grid-2">
        {d.receivables && (
          <Panel title="Top balances owed" link={{ href: `${base}/residences`, label: 'All residences' }} empty="Nobody owes anything. 🎉">
            {d.receivables.top_owing.map((r) => (
              <tr key={r.id}>
                <td><Link href={`${base}/residences/${r.id}`}>{r.name}</Link></td>
                <td className="num neg">{m(r.balance)}</td>
              </tr>
            ))}
          </Panel>
        )}
        {d.finance && (
          <Panel title="Recent transactions" link={{ href: `${base}/account`, label: 'Estate account' }} empty="No transactions yet.">
            {d.finance.recent_transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.category}<div className="small muted">{date(t.occurred_at)}</div></td>
                <td className={`num ${t.type === 'income' ? 'pos' : 'neg'}`}>{t.type === 'income' ? '+' : '−'}{m(t.amount)}</td>
              </tr>
            ))}
          </Panel>
        )}
        {d.recent_announcements && (
          <Panel title="Recent announcements" link={{ href: `${base}/announcements`, label: 'All' }} empty="No announcements yet.">
            {d.recent_announcements.map((a) => (
              <tr key={a.id}><td>{a.title}</td><td className="num muted">{date(a.published_at)}</td></tr>
            ))}
          </Panel>
        )}
        {d.active_dues && (
          <Panel title="Active dues" link={{ href: `${base}/dues`, label: 'All dues' }} empty="No active dues.">
            {d.active_dues.map((due) => (
              <tr key={due.id}>
                <td>{due.title}<div className="small muted">{FREQUENCY_LABELS[due.frequency]}</div></td>
                <td className="num">{m(due.amount)}</td>
              </tr>
            ))}
          </Panel>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, className = '', note }: { label: string; value: React.ReactNode; className?: string; note?: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className={`value ${className}`}>{value}</div>
      {note && <div className="small muted">{note}</div>}
    </div>
  )
}

function Panel({ title, link, empty, children }: { title: string; link: { href: string; label: string }; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>{title}</h2>
        <Link href={link.href} className="small">{link.label}</Link>
      </div>
      {children.length ? (
        <table><tbody>{children}</tbody></table>
      ) : (
        <div className="empty">{empty}</div>
      )}
    </div>
  )
}
