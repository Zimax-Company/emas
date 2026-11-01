import { z } from 'zod'
import { db } from '@/lib/db'
import { authorize, estateContext, type EstateContext } from '@/lib/rbac'
import { forbidden, handle, id, noContent, notFound, ok, parseBody } from '@/lib/http'
import { assertAdminRemains, resolveAssignableRoles } from '@/lib/roles'
import { listMembers } from '@/lib/members'

type P = { eid: string; mid: string }

async function findMember(ctx: EstateContext, mid: string) {
  const member = await db('estate_members').where({ id: id(mid, 'Member'), estate_id: ctx.estate.id }).first()
  if (!member) throw notFound('Member')
  const isAdminMember = await db('estate_member_roles as mr')
    .join('roles as r', 'r.id', 'mr.role_id')
    .where({ 'mr.estate_member_id': member.id, 'r.is_admin': true })
    .first('r.id')
  // Only admins can change or remove another admin.
  if (isAdminMember && !ctx.isAdmin) throw forbidden('Only estate admins can modify an estate admin')
  return { ...member, isAdminMember: Boolean(isAdminMember) }
}

const schema = z.object({ role_ids: z.array(z.number().int().positive()).min(1) })

export const PATCH = handle<P>(async (req, { eid, mid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'members.manage')
  const member = await findMember(ctx, mid)
  const body = await parseBody(req, schema)

  await db.transaction(async (trx) => {
    const roleIds = await resolveAssignableRoles(ctx, body.role_ids, trx)
    const keepsAdmin = await trx('roles').whereIn('id', roleIds).where({ is_admin: true }).first('id')
    if (member.isAdminMember && !keepsAdmin) await assertAdminRemains(trx, ctx.estate.id, member.id)
    await trx('estate_member_roles').where({ estate_member_id: member.id }).delete()
    await trx('estate_member_roles').insert(roleIds.map((role_id) => ({ estate_member_id: member.id, role_id })))
  })
  return ok((await listMembers(ctx.estate.id, member.id))[0])
})

export const DELETE = handle<P>(async (req, { eid, mid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'members.manage')
  const member = await findMember(ctx, mid)

  await db.transaction(async (trx) => {
    if (member.isAdminMember) await assertAdminRemains(trx, ctx.estate.id, member.id)
    await trx('residence_residents')
      .where('user_id', member.user_id)
      .whereIn('residence_id', trx('residences').select('id').where('estate_id', ctx.estate.id))
      .delete()
    await trx('estate_members').where({ id: member.id }).delete()
  })
  return noContent()
})
