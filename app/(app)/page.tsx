import type { Metadata } from 'next'
import Link from 'next/link'
import { getMe } from '@/lib/server'

export const metadata: Metadata = { title: 'Estates' }

export default async function EstatesPage() {
  const { user, estates } = await getMe()

  return (
    <main className="content" style={{ margin: '0 auto' }}>
      <div className="page-head">
        <div>
          <h1>Your estates</h1>
          <p className="muted">Each estate has its own dashboard. Pick one to open it.</p>
        </div>
        {user.is_system_admin && (
          <Link href="/admin/estates/new" className="btn primary">
            New estate
          </Link>
        )}
      </div>

      {estates.length ? (
        <div className="grid">
          {estates.map((e) => (
            <Link key={e.id} href={`/estates/${e.id}`} className="card card-body" style={{ color: 'inherit', textDecoration: 'none' }}>
              <div className="row between">
                <h2>{e.name}</h2>
                {e.is_admin && <span className="badge primary">Admin</span>}
              </div>
              <p className="muted small" style={{ marginTop: 6 }}>
                {e.address || 'No address'}
              </p>
              <p className="small" style={{ marginTop: 10 }}>
                {e.roles.join(', ') || (user.is_system_admin ? 'System admin' : '')}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty">
            {user.is_system_admin ? (
              <>
                No estates yet. <Link href="/admin/estates/new">Create the first one</Link>.
              </>
            ) : (
              "You haven't been added to an estate yet. Ask your estate admin to add you."
            )}
          </div>
        </div>
      )}
    </main>
  )
}
