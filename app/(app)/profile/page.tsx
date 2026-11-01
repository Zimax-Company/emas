import type { Metadata } from 'next'
import { getMe } from '@/lib/server'
import { PasswordForm } from './password-form'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const { user } = await getMe()
  return (
    <main className="content stack" style={{ margin: '0 auto', maxWidth: 520 }}>
      <div className="page-head">
        <div>
          <h1>{user.name}</h1>
          <p className="muted">{user.email}</p>
        </div>
      </div>
      <PasswordForm />
    </main>
  )
}
