import type { Metadata } from 'next'
import { GET } from '@/app/api/users/route'
import { load, param, requireSystemAdminPage, type SearchParams } from '@/lib/server'
import type { AdminUser } from '@/lib/types'
import { UsersView } from './view'

export const metadata: Metadata = { title: 'Users' }

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const me = await requireSystemAdminPage()
  const q = await param(searchParams, 'q')
  const users = await load<AdminUser[]>(GET, {}, { q })
  return (
    <main className="content" style={{ margin: '0 auto' }}>
      <UsersView users={users} meId={me.user.id} q={q ?? ''} />
    </main>
  )
}
