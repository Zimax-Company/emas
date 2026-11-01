import { NavLink } from '@/components/NavLink'
import { can, getEstate } from '@/lib/server'

export default async function EstateLayout({ children, params }: { children: React.ReactNode; params: Promise<{ eid: string }> }) {
  const { eid } = await params
  const e = await getEstate(eid)
  const base = `/estates/${eid}`
  const admin = can(e, 'members.view') || can(e, 'roles.view') || can(e, 'estate.update')

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="estate-name">
          {e.estate.name}
          <div className="small muted">{e.access.roles.map((r) => r.name).join(', ') || (e.access.is_admin ? 'System admin' : '')}</div>
        </div>
        <nav>
          <NavLink href={base}>Dashboard</NavLink>
          <NavLink href={`${base}/residences`} prefix>
            {can(e, 'residences.view') ? 'Residences' : 'My residence'}
          </NavLink>
          {can(e, 'announcements.view') && <NavLink href={`${base}/announcements`}>Announcements</NavLink>}
          {can(e, 'dues.view') && <NavLink href={`${base}/dues`}>Dues</NavLink>}
          {can(e, 'estate_accounts.view') && <NavLink href={`${base}/account`}>Estate account</NavLink>}
          {admin && <div className="section">Administration</div>}
          {can(e, 'members.view') && <NavLink href={`${base}/members`}>Members</NavLink>}
          {can(e, 'roles.view') && <NavLink href={`${base}/roles`}>Roles &amp; permissions</NavLink>}
          {can(e, 'estate.update') && <NavLink href={`${base}/settings`}>Settings</NavLink>}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  )
}
