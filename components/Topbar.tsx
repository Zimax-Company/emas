'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { apiCall } from '@/lib/client'
import type { Me } from '@/lib/types'

export function Topbar({ me }: { me: Me }) {
  const router = useRouter()
  const params = useParams<{ eid?: string }>()

  async function logout() {
    await apiCall('POST', '/auth/logout')
    router.replace('/login')
    router.refresh()
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        EM<span>AS</span>
      </Link>
      {me.estates.length > 0 && (
        <select
          aria-label="Switch estate dashboard"
          value={params.eid ?? ''}
          onChange={(e) => router.push(e.target.value ? `/estates/${e.target.value}` : '/')}
        >
          <option value="">All estates</option>
          {me.estates.map((e) => (
            <option key={e.id} value={String(e.id)}>
              {e.name}
            </option>
          ))}
        </select>
      )}
      <div className="spacer" />
      {me.user.is_system_admin && (
        <>
          <Link href="/admin/users" className="small">
            Users
          </Link>
          <Link href="/admin/estates/new" className="small">
            New estate
          </Link>
        </>
      )}
      <Link href="/profile" className="small">
        {me.user.name}
      </Link>
      <button className="btn sm" type="button" onClick={logout}>
        Sign out
      </button>
    </header>
  )
}
