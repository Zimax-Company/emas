import type { Metadata } from 'next'
import { GET as getMembers } from '@/app/api/estates/[eid]/members/route'
import { GET as getRoles } from '@/app/api/estates/[eid]/roles/route'
import { GET as getResidences } from '@/app/api/estates/[eid]/residences/route'
import { can, getEstate, load } from '@/lib/server'
import type { Member, ResidenceRow, Role } from '@/lib/types'
import { Forbidden } from '@/components/Forbidden'
import { MembersView } from './view'

export const metadata: Metadata = { title: 'Members' }

export default async function MembersPage({ params }: { params: Promise<{ eid: string }> }) {
  const { eid } = await params
  const e = await getEstate(eid)
  if (!can(e, 'members.view')) return <Forbidden />
  const manage = can(e, 'members.manage')
  const p = { eid }
  const [members, roles, residences] = await Promise.all([
    load<Member[], typeof p>(getMembers, p),
    manage ? load<Role[], typeof p>(getRoles, p) : [],
    manage ? load<ResidenceRow[], typeof p>(getResidences, p) : [],
  ])
  // Only estate admins may hand out the admin role.
  const assignable = roles.filter((r) => !r.is_admin || e.access.is_admin).map((r) => ({ id: r.id, name: r.name }))
  return (
    <MembersView
      eid={eid}
      members={members}
      assignable={assignable}
      residences={residences.map((r) => ({ id: r.id, name: r.name }))}
      canManage={manage}
    />
  )
}
