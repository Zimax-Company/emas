import type { UseFetchOptions } from 'nuxt/app'

type Envelope<T> = { data: T }

/** SSR-friendly GET against the EMAS API (via the server proxy). Unwraps `{ data }`. */
export function useApi<T>(path: MaybeRefOrGetter<string>, opts: UseFetchOptions<Envelope<T>, T> = {}) {
  return useFetch(() => `/api/proxy${toValue(path)}`, {
    key: () => `api:${toValue(path)}`,
    transform: (r: Envelope<T>) => r.data,
    ...opts,
  } as UseFetchOptions<Envelope<T>, T>)
}

/** Mutating request from the browser (or server). Returns the unwrapped `data`. */
export async function apiCall<T = unknown>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown) {
  const fetcher = import.meta.server ? useRequestFetch() : $fetch
  const res = await fetcher<Envelope<T> | null>(`/api/proxy${path}`, { method, body: body as Record<string, unknown> })
  return res?.data as T
}

/** Human-readable message from an API error. */
export function errorMessage(err: unknown): string {
  const e = err as { data?: { error?: { message?: string; details?: { path: string; message: string }[] } }; message?: string }
  const apiErr = e?.data?.error
  if (apiErr?.details?.length) return `${apiErr.message}: ${apiErr.details.map((d) => `${d.path || 'field'} — ${d.message}`).join('; ')}`
  return apiErr?.message ?? e?.message ?? 'Something went wrong'
}

/** Small helper for forms: tracks pending state and the last error. */
export function useAction() {
  const pending = ref(false)
  const error = ref<string | null>(null)
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    pending.value = true
    error.value = null
    try {
      return await fn()
    } catch (err) {
      error.value = errorMessage(err)
    } finally {
      pending.value = false
    }
  }
  return { pending, error, run }
}
