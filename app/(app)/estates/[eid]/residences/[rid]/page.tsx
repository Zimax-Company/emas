import Link from 'next/link'
import { GET as getResidence } from '@/app/api/estates/[eid]/residences/[rid]/route'
import { GET as getInbox } from '@/app/api/estates/[eid]/residences/[rid]/inbox/route'
import { GET as getLedger } from '@/app/api/estates/[eid]/residences/[rid]/transactions/route'
import { GET as getVisitors } from '@/app/api/estates/[eid]/residences/[rid]/visitors/route'
import { can, getEstate, load, param, type SearchParams } from '@/lib/server'
import { money } from '@/lib/format'
import type { InboxMessage, Residence, ResidenceLedger, VisitorPass } from '@/lib/types'
import { AccountTab, InboxTab, OverviewTab, VisitorsTab } from './tabs'

type P = { params: Promise<{ eid: string; rid: string }>; searchParams: SearchParams }

export async function generateMetadata({ params }: P) {
  const p = await params
  const r = await load<Residence, { eid: string; rid: string }>(getResidence, p)
  return { title: r.name }
}

export default async function ResidencePage({ params, searchParams }: P) {
  const p = await params
  const tab = (await param(searchParams, 'tab')) ?? 'overview'
  const [e, r] = await Promise.all([getEstate(p.eid), load<Residence, typeof p>(getResidence, p)])
  const canSeeInbox = r.access.is_resident || can(e, 'announcements.view')
  const canSeeAccount = r.account !== null
  const canIssueVisitors = r.access.is_resident || can(e, 'visitors.manage')
  const canSeeVisitors = canIssueVisitors || can(e, 'visitors.view')
  const [inbox, ledger, visitors] = await Promise.all([
    tab === 'inbox' && canSeeInbox ? load<InboxMessage[], typeof p>(getInbox, p) : null,
    tab === 'account' && canSeeAccount ? load<ResidenceLedger, typeof p>(getLedger, p) : null,
    tab === 'visitors' && canSeeVisitors ? load<VisitorPass[], typeof p>(getVisitors, p) : null,
  ])
  const base = `/estates/${p.eid}`
  const path = `${base}/residences/${p.rid}`
  const currency = e.estate.currency

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p className="small"><Link href={`${base}/residences`}>← Residences</Link></p>
          <h1>{r.name}</h1>
          <p className="muted">{[r.address_line1, r.address_line2, r.city, r.state, r.postal_code].filter(Boolean).join(', ')}</p>
        </div>
        {r.account && (
          <div className="card stat" style={{ minWidth: 200 }}>
            <div className="label">Balance owed</div>
            <div className={`value ${r.account.balance > 0 ? 'neg' : 'pos'}`}>{money(r.account.balance, currency)}</div>
          </div>
        )}
      </div>

      <nav className="tabs">
        <Link href={path} className={tab === 'overview' ? 'active' : undefined}>Overview</Link>
        {canSeeInbox && (
          <Link href={`${path}?tab=inbox`} className={tab === 'inbox' ? 'active' : undefined}>
            Inbox {r.unread_count > 0 && <span className="badge primary">{r.unread_count}</span>}
          </Link>
        )}
        {canSeeAccount && (
          <Link href={`${path}?tab=account`} className={tab === 'account' ? 'active' : undefined}>Account</Link>
        )}
        {canSeeVisitors && (
          <Link href={`${path}?tab=visitors`} className={tab === 'visitors' ? 'active' : undefined}>Visitors</Link>
        )}
      </nav>

      {tab === 'inbox' && inbox ? (
        <InboxTab apiPath={path} messages={inbox} isResident={r.access.is_resident} />
      ) : tab === 'visitors' && visitors ? (
        <VisitorsTab apiPath={path} passes={visitors} canIssue={canIssueVisitors} />
      ) : tab === 'account' && ledger ? (
        <AccountTab apiPath={path} ledger={ledger} currency={currency} canManage={r.access.can_manage_account} />
      ) : (
        <OverviewTab apiPath={path} residencesPath={`${base}/residences`} residence={r} canManageMembers={can(e, 'members.manage')} />
      )}
    </div>
  )
}
