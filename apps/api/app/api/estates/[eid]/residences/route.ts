import { z } from 'zod'
import { db } from '@/lib/db'
import { authorize, can, estateContext } from '@/lib/rbac'
import { created, handle, ok, parseBody, parseQuery } from '@/lib/http'
import { residenceBalances } from '@/lib/ledger'
import { contactSchema, residenceSchema } from '@/lib/residences'

type P = { eid: string }

export const GET = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  const { q } = parseQuery(req, z.object({ q: z.string().trim().optional() }))

  const query = db('residences as r')
    .leftJoin('residence_contacts as c', function () {
      this.on('c.residence_id', 'r.id').andOn('c.is_primary', db.raw('1'))
    })
    .where('r.estate_id', ctx.estate.id)
    .select('r.*', 'c.name as primary_contact_name', 'c.phone as primary_contact_phone')
    .orderBy('r.name')
  // Without residences.view, residents only see their own residences.
  if (!can(ctx, 'residences.view')) query.whereIn('r.id', ctx.residenceIds)
  if (q) query.andWhere((w) => w.whereLike('r.name', `%${q}%`).orWhereLike('r.address_line1', `%${q}%`))

  const rows = await query
  const seen = new Set<number>()
  const residences = rows.filter((r) => !seen.has(r.id) && seen.add(r.id))
  const balance = await residenceBalances(ctx.estate.id, residences.map((r) => r.id))
  const canSeeAccounts = can(ctx, 'residence_accounts.view')
  return ok(
    residences.map((r) => ({
      ...r,
      balance: canSeeAccounts || ctx.residenceIds.includes(r.id) ? balance(r.id).balance : null,
    })),
  )
})

const createSchema = residenceSchema.extend({ contacts: z.array(contactSchema).default([]) })

export const POST = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'residences.manage')
  const { contacts, ...body } = await parseBody(req, createSchema)

  const residenceId = await db.transaction(async (trx) => {
    const [residenceId] = await trx('residences').insert({ ...body, estate_id: ctx.estate.id })
    if (contacts.length) {
      const hasPrimary = contacts.some((c) => c.is_primary)
      await trx('residence_contacts').insert(
        contacts.map((c, i) => ({ ...c, is_primary: hasPrimary ? c.is_primary : i === 0, residence_id: residenceId })),
      )
    }
    return residenceId
  })
  return created(await db('residences').where({ id: residenceId }).first())
})
