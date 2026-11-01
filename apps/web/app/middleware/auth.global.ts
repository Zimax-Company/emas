const PUBLIC = new Set(['/login'])

export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSession()
  if (!session.me.value) await session.refresh()

  if (PUBLIC.has(to.path)) {
    if (session.me.value) return navigateTo('/')
    return
  }
  if (!session.me.value) return navigateTo(`/login?next=${encodeURIComponent(to.fullPath)}`)
  if (to.path.startsWith('/admin') && !session.user.value?.is_system_admin) return navigateTo('/')
})
