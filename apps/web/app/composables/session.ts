export type SessionUser = {
  id: number
  name: string
  email: string
  phone: string | null
  is_system_admin: boolean
}

export type EstateSummary = {
  id: number
  name: string
  slug: string
  address: string | null
  currency: string
  roles: string[]
  is_admin: boolean
}

type Me = { user: SessionUser; estates: EstateSummary[] }

export function useSession() {
  const me = useState<Me | null>('session:me', () => null)

  async function refresh() {
    try {
      const res = await useRequestFetch()<{ data: Me }>('/api/proxy/auth/me')
      me.value = res.data
    } catch {
      me.value = null
    }
    return me.value
  }

  async function login(email: string, password: string) {
    await $fetch('/api/auth/login', { method: 'POST', body: { email, password } })
    await refresh()
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    me.value = null
    await navigateTo('/login')
  }

  return {
    me,
    user: computed(() => me.value?.user ?? null),
    estates: computed(() => me.value?.estates ?? []),
    refresh,
    login,
    logout,
  }
}
