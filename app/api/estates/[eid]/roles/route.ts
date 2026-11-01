import { db } from '@/lib/db'
import { authorize, can, estateContext } from '@/lib/rbac'
import { created, forbidden, handle, ok, parseBody } from '@/lib/http'
import { assertCanGrant, listRoles, roleSchema } from '@/lib/roles'
import { slugify } from '@/lib/estates'

type P = { eid: string }

export const GET = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  if (!can(ctx, 'roles.view') && !can(ctx, 'members.manage')) throw forbidden()
  return ok(await listRoles(ctx.estate.id))
})

export const POST = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'roles.manage')
  const body = await parseBody(req, roleSchema)
  assertCanGrant(ctx, body.permissions)

  const roleId = await db.transaction(async (trx) => {
    const [roleId] = await trx('roles').insert({
      estate_id: ctx.estate.id,
      name: body.name,
      slug: slugify(body.name),
      description: body.description ?? null,
    })
    if (body.permissions.length) {
      await trx('role_permissions').insert([...new Set(body.permissions)].map((p) => ({ role_id: roleId, permission_key: p })))
    }
    return roleId
  })
  return created((await listRoles(ctx.estate.id)).find((r) => r.id === roleId))
})
