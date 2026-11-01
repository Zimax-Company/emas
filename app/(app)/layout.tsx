import { Topbar } from '@/components/Topbar'
import { getMe } from '@/lib/server'

// Every page under (app) requires a session; getMe() redirects to /login without one.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe()
  return (
    <>
      <Topbar me={me} />
      {children}
    </>
  )
}
