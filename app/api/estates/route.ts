import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSystemAdmin, requireUser } from '@/lib/auth'
import { created, handle, ok, parseBody } from '@/lib/http'
import { createDefaultRoles, listEstatesFor, slugify } from '@/lib/estates'
import { addMember, findOrCreateUser, newUserSchema } from '@/lib/users'

export const GET = handle(async (req) => {
  const user = await requireUser(req)
  return ok(await listEstatesFor(user))
})

const schema = z.object({
  name: z.string().trim().min(2).max(150),
  address: z.string().trim().max(2000).optional().nullable(),
  currency: z.string().trim().length(3).toUpperCase().default('NGN'),
  // Optional first estate admin; created if the email is new.
  admin: newUserSchema.optional(),
})

export const POST = handle(async (req) => {
  const sysadmin = await requireSystemAdmin(req)
  const body = await parseBody(req, schema)

  const result = await db.transaction(async (trx) => {
    const base = slugify(body.name) || 'estate'
    let slug = base
    for (let i = 2; await trx('estates').where({ slug }).first('id'); i++) slug = `${base}-${i}`

    const [estateId] = await trx('estates').insert({
      name: body.name,
      slug,
      address: body.address ?? null,
      currency: body.currency,
      created_by: sysadmin.id,
    })
    const roles = await createDefaultRoles(trx, estateId)

    let admin = null
    if (body.admin) {
      const res = await findOrCreateUser(trx, body.admin)
      await addMember(trx, estateId, res.user.id, [roles.admin])
      admin = res
    }
    return { estate: await trx('estates').where({ id: estateId }).first(), admin }
  })

  return created(result)
})
