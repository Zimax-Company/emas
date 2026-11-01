import { z } from 'zod'
import { db } from '@/lib/db'
import { authorize, estateContext } from '@/lib/rbac'
import { badRequest, created, handle, ok, parseBody } from '@/lib/http'

type P = { eid: string }

export const GET = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'announcements.view')
  const rows = await db('announcements as a')
    .leftJoin('users as u', 'u.id', 'a.author_id')
    .leftJoin('inbox_messages as m', 'm.announcement_id', 'a.id')
    .where('a.estate_id', ctx.estate.id)
    .groupBy('a.id', 'u.name')
    .orderBy('a.published_at', 'desc')
    .limit(200)
    .select(
      'a.id', 'a.title', 'a.body', 'a.audience', 'a.published_at', 'u.name as author_name',
      db.raw('count(m.id) as recipients'),
      db.raw('count(m.read_at) as read_count'),
    )
  return ok(rows.map((r) => ({ ...r, recipients: Number(r.recipients), read_count: Number(r.read_count) })))
})

const schema = z
  .object({
    title: z.string().trim().min(1).max(191),
    body: z.string().trim().min(1).max(20000),
    audience: z.enum(['all', 'selected']).default('all'),
    residence_ids: z.array(z.number().int().positive()).default([]),
  })
  .refine((b) => b.audience === 'all' || b.residence_ids.length > 0, {
    message: 'Select at least one residence',
    path: ['residence_ids'],
  })

export const POST = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'announcements.publish')
  const body = await parseBody(req, schema)

  const result = await db.transaction(async (trx) => {
    const target = trx('residences').where('estate_id', ctx.estate.id)
    if (body.audience === 'selected') target.whereIn('id', body.residence_ids)
    const residenceIds: number[] = await target.pluck('id')
    if (!residenceIds.length) throw badRequest('There are no residences to send this announcement to')

    const [announcementId] = await trx('announcements').insert({
      estate_id: ctx.estate.id,
      author_id: ctx.user.id,
      title: body.title,
      body: body.body,
      audience: body.audience,
      published_at: new Date(),
    })
    await trx('inbox_messages').insert(residenceIds.map((residence_id) => ({ announcement_id: announcementId, residence_id })))
    return { id: announcementId, recipients: residenceIds.length }
  })
  return created(result)
})
