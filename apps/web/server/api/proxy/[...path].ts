// Forwards /api/proxy/<path> to the EMAS API with the session token as a Bearer header.
export default defineEventHandler(async (event) => {
  const { apiUrl } = useRuntimeConfig(event)
  const path = getRouterParam(event, 'path') ?? ''
  const search = getRequestURL(event).search
  const token = getCookie(event, TOKEN_COOKIE)

  const headers: Record<string, string> = { accept: 'application/json' }
  const contentType = getRequestHeader(event, 'content-type')
  if (contentType) headers['content-type'] = contentType
  if (token) headers.authorization = `Bearer ${token}`

  const method = event.method
  let res: Response
  try {
    res = await fetch(`${apiUrl}/api/${path}${search}`, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : await readRawBody(event, false),
    })
  } catch {
    setResponseStatus(event, 502)
    return { error: { message: 'The EMAS API is unavailable. Please try again shortly.' } }
  }

  if (res.status === 401) clearSessionToken(event)
  setResponseStatus(event, res.status)
  if (res.status === 204) return null
  setResponseHeader(event, 'content-type', res.headers.get('content-type') ?? 'application/json')
  return res.text()
})
