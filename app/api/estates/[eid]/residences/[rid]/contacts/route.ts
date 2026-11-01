import { db } from '@/lib/db'
import { authorize, estateContext, findResidence } from '@/lib/rbac'
import { created, handle, parseBody } from '@/lib/http'
import { contactSchema } from '@/lib/residences'

type P = { eid: string; rid: string }

export const POST = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'residences.manage')
  const residence = await findResidence(ctx, rid)
  const body = await parseBody(req, contactSchema)

  const contactId = await db.transaction(async (trx) => {
    const first = !(await trx('residence_contacts').where({ residence_id: residence.id }).first('id'))
    const isPrimary = body.is_primary || first
    if (isPrimary) await trx('residence_contacts').where({ residence_id: residence.id }).update({ is_primary: false })
    const [contactId] = await trx('residence_contacts').insert({ ...body, is_primary: isPrimary, residence_id: residence.id })
    return contactId
  })
  return created(await db('residence_contacts').where({ id: contactId }).first())
})
