'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import type { EstateAccess } from '@/lib/types'
import { FormError } from '@/components/FormError'

export function SettingsForm({ estate, canDelete }: { estate: EstateAccess['estate']; canDelete: boolean }) {
  const router = useRouter()
  const [form, setForm] = useState({ name: estate.name, address: estate.address ?? '', currency: estate.currency })
  const [saved, setSaved] = useState(false)
  const { pending, error, run } = useAction()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    await run(async () => {
      await apiCall('PATCH', `/estates/${estate.id}`, form)
      setSaved(true)
    })
  }

  async function destroy() {
    if (prompt('Type the estate name to permanently delete it:') !== estate.name) return
    await run(async () => {
      await apiCall('DELETE', `/estates/${estate.id}`)
      router.push('/')
    })
  }

  return (
    <>
      <form className="card card-body form" onSubmit={save}>
        <FormError error={error} />
        {saved && <div className="alert success">Saved.</div>}
        <label>Name <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Address <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        <label style={{ maxWidth: 160 }}>
          Currency <input maxLength={3} required value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        </label>
        <div className="actions"><button className="btn primary" disabled={pending}>Save</button></div>
      </form>
      {canDelete && (
        <div className="card card-body form">
          <h2>Danger zone</h2>
          <p className="muted">Deleting an estate removes its residences, accounts, announcements and memberships.</p>
          <div className="actions"><button className="btn danger" onClick={destroy}>Delete estate</button></div>
        </div>
      )}
    </>
  )
}
