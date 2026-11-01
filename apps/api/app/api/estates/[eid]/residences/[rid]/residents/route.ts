import { z } from 'zod'
import { db } from '@/lib/db'
import { authorize, estateContext, findResidence } from '@/lib/rbac'
import { badRequest, created, handle, parseBody } from '@/lib/http'
import { addMember, findOrCreateUser, newUserSchema } from '@/lib/users'
import { roleIdBySlug } from '@/lib/estates'

type P = { eid: string; rid: string }

// Either link an existing estate member by user_id, or invite someone by email.
const schema = z.union([z.object({ user_id: z.number().int().positive() }), newUserSchema])

export const POST = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'residences.manage')
  authorize(ctx, 'members.manage')
  const residence = await findResidence(ctx, rid)
  const body = await parseBody(req, schema)

  const result = await db.transaction(async (trx) => {
    let userId: number
    let temporary_password: string | null = null
    if ('user_id' in body) {
      const member = await trx('estate_members').where({ estate_id: ctx.estate.id, user_id: body.user_id }).first('id')
      if (!member) throw badRequest('User is not a member of this estate')
      userId = body.user_id
    } else {
      const res = await findOrCreateUser(trx, body)
      userId = res.user.id
      temporary_password = res.temporary_password
      const existing = await trx('estate_members').where({ estate_id: ctx.estate.id, user_id: userId }).first('id')
      // New members get the default resident role.
      await addMember(trx, ctx.estate.id, userId, existing ? [] : [(await roleIdBySlug(ctx.estate.id, 'resident', trx))!])
    }
    await trx('residence_residents').insert({ residence_id: residence.id, user_id: userId }).onConflict().ignore()
    const user = await trx('users').where({ id: userId }).first('id', 'name', 'email', 'phone')
    return { user, temporary_password }
  })
  return created(result)
})
