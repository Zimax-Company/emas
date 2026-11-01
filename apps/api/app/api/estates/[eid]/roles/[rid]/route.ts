import { db } from '@/lib/db'
import { authorize, estateContext } from '@/lib/rbac'
import { badRequest, handle, id, noContent, notFound, ok, parseBody } from '@/lib/http'
import { assertCanGrant, listRoles, roleUpdateSchema } from '@/lib/roles'

type P = { eid: string; rid: string }

async function findRole(estateId: number, rid: string) {
  const role = await db('roles').where({ id: id(rid, 'Role'), estate_id: estateId }).first()
  if (!role) throw notFound('Role')
  return role
}

export const PATCH = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'roles.manage')
  const role = await findRole(ctx.estate.id, rid)
  if (role.is_admin) throw badRequest('The estate admin role always has every permission and cannot be edited')

  const body = await parseBody(req, roleUpdateSchema)
  if (body.permissions) assertCanGrant(ctx, body.permissions)

  await db.transaction(async (trx) => {
    const patch: Record<string, unknown> = {}
    if (body.name !== undefined && !role.is_default) patch.name = body.name // default roles keep their names
    if (body.description !== undefined) patch.description = body.description
    if (Object.keys(patch).length) await trx('roles').where({ id: role.id }).update(patch)
    if (body.permissions) {
      await trx('role_permissions').where({ role_id: role.id }).delete()
      if (body.permissions.length) {
        await trx('role_permissions').insert([...new Set(body.permissions)].map((p) => ({ role_id: role.id, permission_key: p })))
      }
    }
  })
  return ok((await listRoles(ctx.estate.id)).find((r) => r.id === role.id))
})

export const DELETE = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'roles.manage')
  const role = await findRole(ctx.estate.id, rid)
  if (role.is_default) throw badRequest('Default roles cannot be deleted')
  await db('roles').where({ id: role.id }).delete()
  return noContent()
})
