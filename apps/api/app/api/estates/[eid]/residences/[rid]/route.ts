import { db } from '@/lib/db'
import { authorize, authorizeResidence, can, estateContext, findResidence } from '@/lib/rbac'
import { handle, noContent, ok, parseBody } from '@/lib/http'
import { residenceBalances } from '@/lib/ledger'
import { residenceUpdateSchema } from '@/lib/residences'

type P = { eid: string; rid: string }

export const GET = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  const residence = await findResidence(ctx, rid)
  authorizeResidence(ctx, residence.id, 'residences.view')

  const [contacts, residents, unread, balance] = await Promise.all([
    db('residence_contacts').where({ residence_id: residence.id }).orderBy([{ column: 'is_primary', order: 'desc' }, 'name']),
    db('residence_residents as rr')
      .join('users as u', 'u.id', 'rr.user_id')
      .where('rr.residence_id', residence.id)
      .select('u.id', 'u.name', 'u.email', 'u.phone'),
    db('inbox_messages').where({ residence_id: residence.id }).whereNull('read_at').count({ n: '*' }).first(),
    residenceBalances(ctx.estate.id, [residence.id]),
  ])

  const isResident = ctx.residenceIds.includes(residence.id)
  return ok({
    ...residence,
    contacts: contacts.map((c) => ({ ...c, is_primary: Boolean(c.is_primary) })),
    residents,
    unread_count: Number(unread?.n ?? 0),
    account: isResident || can(ctx, 'residence_accounts.view') ? balance(residence.id) : null,
    access: {
      is_resident: isResident,
      can_manage: can(ctx, 'residences.manage'),
      can_manage_account: can(ctx, 'residence_accounts.manage'),
    },
  })
})

export const PATCH = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'residences.manage')
  const residence = await findResidence(ctx, rid)
  const body = await parseBody(req, residenceUpdateSchema)
  if (Object.keys(body).length) await db('residences').where({ id: residence.id }).update(body)
  return ok(await db('residences').where({ id: residence.id }).first())
})

export const DELETE = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'residences.manage')
  const residence = await findResidence(ctx, rid)
  await db('residences').where({ id: residence.id }).delete()
  return noContent()
})
