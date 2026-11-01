export type EstateAccess = {
  estate: { id: number; name: string; slug: string; address: string | null; currency: string }
  access: {
    is_admin: boolean
    roles: { id: number; name: string; slug: string }[]
    permissions: string[]
    residence_ids: number[]
  }
}

/** The estate in the current route and the caller's permissions in it. */
export function useEstate() {
  const route = useRoute()
  const eid = computed(() => String(route.params.eid))
  const { data, refresh } = useApi<EstateAccess>(() => `/estates/${eid.value}`, {
    key: () => `estate:${eid.value}`,
  })

  const can = (perm: string) => Boolean(data.value?.access.permissions.includes(perm))
  const currency = computed(() => data.value?.estate.currency ?? 'NGN')
  const base = computed(() => `/estates/${eid.value}`)

  return { eid, data, refresh, can, currency, base }
}
