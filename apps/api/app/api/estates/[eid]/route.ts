import { z } from 'zod'
import { db } from '@/lib/db'
import { authorize, estateContext } from '@/lib/rbac'
import { forbidden, handle, noContent, ok, parseBody } from '@/lib/http'

type P = { eid: string }

export const GET = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  return ok({
    estate: ctx.estate,
    access: {
      is_admin: ctx.isAdmin,
      roles: ctx.roles,
      permissions: [...ctx.permissions],
      residence_ids: ctx.residenceIds,
    },
  })
})

const schema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  address: z.string().trim().max(2000).nullable().optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
})

export const PATCH = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'estate.update')
  const body = await parseBody(req, schema)
  if (Object.keys(body).length) await db('estates').where({ id: ctx.estate.id }).update(body)
  return ok(await db('estates').where({ id: ctx.estate.id }).first())
})

export const DELETE = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  if (!ctx.user.is_system_admin) throw forbidden('Only a system admin can delete an estate')
  await db('estates').where({ id: ctx.estate.id }).delete()
  return noContent()
})
