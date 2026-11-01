import { z } from 'zod'
import { db } from '@/lib/db'
import { authorize, estateContext } from '@/lib/rbac'
import { badRequest, created, handle, ok, parseBody } from '@/lib/http'
import { addMember, findOrCreateUser, newUserSchema } from '@/lib/users'
import { resolveAssignableRoles } from '@/lib/roles'
import { roleIdBySlug } from '@/lib/estates'
import { listMembers } from '@/lib/members'

type P = { eid: string }

export const GET = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'members.view')
  return ok(await listMembers(ctx.estate.id))
})

const schema = newUserSchema.extend({
  role_ids: z.array(z.number().int().positive()).default([]),
  residence_id: z.number().int().positive().nullable().optional(),
})

export const POST = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'members.manage')
  const body = await parseBody(req, schema)

  const result = await db.transaction(async (trx) => {
    let roleIds = await resolveAssignableRoles(ctx, body.role_ids, trx)
    if (!roleIds.length) roleIds = [(await roleIdBySlug(ctx.estate.id, 'resident', trx))!]

    if (body.residence_id) {
      const residence = await trx('residences').where({ id: body.residence_id, estate_id: ctx.estate.id }).first('id')
      if (!residence) throw badRequest('Residence does not belong to this estate')
    }

    const res = await findOrCreateUser(trx, body)
    const memberId = await addMember(trx, ctx.estate.id, res.user.id, roleIds)
    if (body.residence_id) {
      await trx('residence_residents').insert({ residence_id: body.residence_id, user_id: res.user.id }).onConflict().ignore()
    }
    return { member_id: memberId, ...res }
  })

  const member = (await listMembers(ctx.estate.id, result.member_id))[0]
  return created({ member, user_created: result.created, temporary_password: result.temporary_password })
})
