import type { Metadata } from 'next'
import { GET as getRoles } from '@/app/api/estates/[eid]/roles/route'
import { GET as getPermissions } from '@/app/api/permissions/route'
import { can, getEstate, load } from '@/lib/server'
import type { PermissionDef, Role } from '@/lib/types'
import { Forbidden } from '@/components/Forbidden'
import { RolesView } from './view'

export const metadata: Metadata = { title: 'Roles & permissions' }

export default async function RolesPage({ params }: { params: Promise<{ eid: string }> }) {
  const { eid } = await params
  const e = await getEstate(eid)
  if (!can(e, 'roles.view')) return <Forbidden />
  const [roles, catalog] = await Promise.all([load<Role[], { eid: string }>(getRoles, { eid }), load<PermissionDef[]>(getPermissions)])
  // Non-admins can only grant permissions they hold.
  const grantable = e.access.is_admin ? catalog.map((p) => p.key) : e.access.permissions
  return <RolesView eid={eid} roles={roles} catalog={catalog} grantable={grantable} canManage={can(e, 'roles.manage')} />
}
