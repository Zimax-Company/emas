type LoginResponse = { data: { token: string; user: unknown } }

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { apiUrl } = useRuntimeConfig(event)
  try {
    const res = await $fetch<LoginResponse>(`${apiUrl}/api/auth/login`, { method: 'POST', body })
    setSessionToken(event, res.data.token)
    return { data: { user: res.data.user } }
  } catch (err: any) {
    // Pass the API's `{ error }` body through unchanged so the form can show its message.
    setResponseStatus(event, err?.response?.status ?? 502)
    return err?.data ?? { error: { message: 'Could not reach the API' } }
  }
})
