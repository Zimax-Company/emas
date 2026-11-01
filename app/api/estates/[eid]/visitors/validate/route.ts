import { authorize, estateContext } from '@/lib/rbac'
import { handle, ok, parseBody } from '@/lib/http'
import { passQuery, useCode, validateSchema, withCodes } from '@/lib/visitors'

type P = { eid: string }

/** Gate staff enter a visitor's code; a valid IN code checks them in, a valid OUT code checks them out. */
export const POST = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  authorize(ctx, 'visitors.validate')
  const { code } = await parseBody(req, validateSchema)
  const { direction, passId } = await useCode(ctx.estate.id, code, ctx.user.id)
  const [pass] = await withCodes(await passQuery(ctx.estate.id).where('p.id', passId), false)
  return ok({ direction, pass })
})
