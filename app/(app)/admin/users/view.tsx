'use client'

import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { date } from '@/lib/format'
import type { AdminUser } from '@/lib/types'
import { FormError } from '@/components/FormError'

const blank = { name: '', email: '', password: '', is_system_admin: false }

export function UsersView({ users, meId, q }: { users: AdminUser[]; meId: number; q: string }) {
  const [form, setForm] = useState(blank)
  const [showForm, setShowForm] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const { pending, error, run } = useAction()

  async function create(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      const res = await apiCall<{ temporary_password: string | null }>('POST', '/users', {
        name: form.name,
        email: form.email,
        is_system_admin: form.is_system_admin,
        ...(form.password ? { password: form.password } : {}),
      })
      setTempPassword(res.temporary_password)
      setForm(blank)
      setShowForm(false)
    })
  }

  const toggle = (u: AdminUser, field: 'is_active' | 'is_system_admin') =>
    run(() => apiCall('PATCH', `/users/${u.id}`, { [field]: !u[field] }))

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p className="muted">Every account across all estates.</p>
        </div>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New user'}
        </button>
      </div>
      <FormError error={error} />
      {tempPassword && (
        <div className="alert success">
          User created. Temporary password: <code>{tempPassword}</code>
        </div>
      )}

      {showForm && (
        <form className="card card-body form" onSubmit={create}>
          <div className="form-grid">
            <label>
              Name <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Email <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Password{' '}
              <input type="password" minLength={8} placeholder="Leave blank to generate" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={form.is_system_admin} onChange={(e) => setForm({ ...form, is_system_admin: e.target.checked })} /> System admin (all
            permissions, every estate)
          </label>
          <div className="actions">
            <button className="btn primary" disabled={pending}>Create user</button>
          </div>
        </form>
      )}

      <div className="card">
        <form className="card-head" method="get">
          <input name="q" defaultValue={q} placeholder="Search name or email" style={{ maxWidth: 320 }} />
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Status</th><th>Last login</th><th /></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.name} {u.is_system_admin && <span className="badge primary">System admin</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.is_active ? 'success' : 'danger'}`}>{u.is_active ? 'Active' : 'Disabled'}</span>
                  </td>
                  <td className="muted">{date(u.last_login_at, true)}</td>
                  <td className="actions">
                    {u.id !== meId && (
                      <>
                        <button className="btn sm" onClick={() => toggle(u, 'is_system_admin')}>
                          {u.is_system_admin ? 'Revoke admin' : 'Make admin'}
                        </button>
                        <button className={`btn sm${u.is_active ? ' danger' : ''}`} onClick={() => toggle(u, 'is_active')}>
                          {u.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
