import { clearSessionCookie } from '@/lib/auth'
import { handle, noContent } from '@/lib/http'

export const POST = handle(async () => {
  const res = noContent()
  clearSessionCookie(res)
  return res
})
