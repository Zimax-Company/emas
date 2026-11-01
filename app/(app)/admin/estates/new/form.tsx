'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { FormError } from '@/components/FormError'

type Created = { estate: { id: number }; admin: { temporary_password: string | null } | null }

export function NewEstateForm() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', address: '', currency: 'NGN' })
  const [admin, setAdmin] = useState({ include: true, name: '', email: '', password: '' })
  const [result, setResult] = useState<Created | null>(null)
  const { pending, error, run } = useAction()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      const res = await apiCall<Created>('POST', '/estates', {
        ...form,
        admin: admin.include ? { name: admin.name, email: admin.email, ...(admin.password ? { password: admin.password } : {}) } : undefined,
      })
      if (res.admin?.temporary_password) setResult(res)
      else router.push(`/estates/${res.estate.id}`)
    })
  }

  if (result?.admin?.temporary_password) {
    return (
      <div className="card card-body form">
        <div className="alert success">Estate created.</div>
        <p>Share this temporary password with the estate admin. It will not be shown again.</p>
        <code style={{ fontSize: 16 }}>{result.admin.temporary_password}</code>
        <div className="actions">
          <Link href={`/estates/${result.estate.id}`} className="btn primary">Open dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <form className="card card-body form" onSubmit={submit}>
      <FormError error={error} />
      <label>
        Estate name <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label>
        Address <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </label>
      <label style={{ maxWidth: 160 }}>
        Currency <input maxLength={3} required value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
      </label>
      <label className="check">
        <input type="checkbox" checked={admin.include} onChange={(e) => setAdmin({ ...admin, include: e.target.checked })} /> Assign an estate admin now
      </label>
      {admin.include && (
        <>
          <div className="form-grid">
            <label>
              Admin name <input required value={admin.name} onChange={(e) => setAdmin({ ...admin, name: e.target.value })} />
            </label>
            <label>
              Admin email <input type="email" required value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} />
            </label>
            <label>
              Password{' '}
              <input type="password" minLength={8} placeholder="Leave blank to generate" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} />
            </label>
          </div>
          <p className="small muted">If the email already has an account, that user is made admin and the password is ignored.</p>
        </>
      )}
      <div className="actions">
        <button className="btn primary" disabled={pending}>Create estate</button>
      </div>
    </form>
  )
}
