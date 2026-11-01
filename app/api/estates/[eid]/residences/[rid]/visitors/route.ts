import { db } from '@/lib/db'
import { authorizeResidence, estateContext, findResidence } from '@/lib/rbac'
import { created, handle, ok, parseBody } from '@/lib/http'
import { insertCode, passQuery, releaseExpiredCodes, visitorPassSchema, withCodes } from '@/lib/visitors'

type P = { eid: string; rid: string }

/** A residence's visitor passes. Codes are only shown to residents and holders of visitors.manage. */
export const GET = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  const residence = await findResidence(ctx, rid)
  if (!ctx.permissions.has('visitors.manage')) authorizeResidence(ctx, residence.id, 'visitors.view')

  const passes = await passQuery(ctx.estate.id)
    .where('p.residence_id', residence.id)
    .orderBy([{ column: 'p.valid_from', order: 'desc' }, { column: 'p.id', order: 'desc' }])
    .limit(200)
  const showCodes = ctx.residenceIds.includes(residence.id) || ctx.permissions.has('visitors.manage')
  return ok(await withCodes(passes, showCodes))
})

/** Issues a visitor pass with a single-use IN code and a single-use OUT code. */
export const POST = handle<P>(async (req, { eid, rid }) => {
  const ctx = await estateContext(req, eid)
  const residence = await findResidence(ctx, rid)
  authorizeResidence(ctx, residence.id, 'visitors.manage')
  const body = await parseBody(req, visitorPassSchema)
  // TIMESTAMP columns round to whole seconds; round down so a pass starting now is usable immediately.
  const validFrom = new Date(Math.floor((body.valid_from ?? new Date()).getTime() / 1000) * 1000)
  const expiresAt = new Date(validFrom.getTime() + body.valid_hours * 3_600_000)

  await releaseExpiredCodes(ctx.estate.id)
  const passId = await db.transaction(async (trx) => {
    const [passId] = await trx('visitor_passes').insert({
      estate_id: ctx.estate.id,
      residence_id: residence.id,
      created_by: ctx.user.id,
      visitor_name: body.visitor_name,
      visitor_phone: body.visitor_phone || null,
      purpose: body.purpose || null,
      valid_from: validFrom,
      expires_at: expiresAt,
    })
    await insertCode(trx, ctx.estate.id, passId, 'in')
    await insertCode(trx, ctx.estate.id, passId, 'out')
    return passId
  })

  const [pass] = await withCodes(await passQuery(ctx.estate.id).where('p.id', passId), true)
  return created(pass)
})
