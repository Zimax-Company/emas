import { db } from '@/lib/db'
import { authorize, estateContext, findResidence } from '@/lib/rbac'
import { handle, id, noContent, notFound, ok, parseBody } from '@/lib/http'
import { contactUpdateSchema } from '@/lib/residences'

type P = { eid: string; rid: string; cid: string }

async function load(req: Parameters<typeof estateContext>[0], { eid, rid, cid }: P) {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'residences.manage')
  const residence = await findResidence(ctx, rid)
  const contact = await db('residence_contacts').where({ id: id(cid, 'Contact'), residence_id: residence.id }).first()
  if (!contact) throw notFound('Contact')
  return contact
}

export const PATCH = handle<P>(async (req, params) => {
  const contact = await load(req, params)
  const body = await parseBody(req, contactUpdateSchema)
  await db.transaction(async (trx) => {
    if (body.is_primary) {
      await trx('residence_contacts').where({ residence_id: contact.residence_id }).update({ is_primary: false })
    }
    if (Object.keys(body).length) await trx('residence_contacts').where({ id: contact.id }).update(body)
  })
  return ok(await db('residence_contacts').where({ id: contact.id }).first())
})

export const DELETE = handle<P>(async (req, params) => {
  const contact = await load(req, params)
  await db('residence_contacts').where({ id: contact.id }).delete()
  return noContent()
})
