'use client'

import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import type { PermissionDef, Role } from '@/lib/types'
import { FormError } from '@/components/FormError'

export function RolesView({ eid, roles, catalog, grantable, canManage }: {
  eid: string; roles: Role[]; catalog: PermissionDef[]; grantable: string[]; canManage: boolean
}) {
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] })
  const { pending, error, run } = useAction()

  const groups = catalog.reduce<Record<string, PermissionDef[]>>((g, p) => ((g[p.group] ??= []).push(p), g), {})
  const labelFor = (key: string) => catalog.find((p) => p.key === key)?.label ?? key
  const editingRole = roles.find((r) => r.id === editing)

  function edit(role?: Role) {
    setEditing(role ? role.id : 'new')
    setForm({ name: role?.name ?? '', description: role?.description ?? '', permissions: [...(role?.permissions ?? ['estate.view'])] })
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      const body = { name: form.name, description: form.description || null, permissions: form.permissions }
      if (editing === 'new') await apiCall('POST', `/estates/${eid}/roles`, body)
      else await apiCall('PATCH', `/estates/${eid}/roles/${editing}`, body)
      setEditing(null)
    })
  }

  const remove = (role: Role) =>
    confirm(`Delete role "${role.name}"? Members keep their other roles.`) && run(() => apiCall('DELETE', `/estates/${eid}/roles/${role.id}`))

  const togglePerm = (key: string, on: boolean) =>
    setForm({ ...form, permissions: on ? [...form.permissions, key] : form.permissions.filter((p) => p !== key) })

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Roles &amp; permissions</h1>
          <p className="muted">
            Every estate has the default <b>Estate Admin</b> (root access) and <b>Resident</b> roles. Create more as needed.
          </p>
        </div>
        {canManage && editing === null && <button className="btn primary" onClick={() => edit()}>New role</button>}
      </div>
      <FormError error={error} />

      {editing !== null && (
        <form className="card card-body form" onSubmit={save}>
          <h2>{editing === 'new' ? 'New role' : 'Edit role'}</h2>
          <div className="form-grid">
            <label>
              Name <input required minLength={2} disabled={editingRole?.is_default} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>Description <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          </div>
          <div className="grid">
            {Object.entries(groups).map(([group, perms]) => (
              <div key={group} className="perm-group">
                <h3>{group}</h3>
                {perms.map((p) => (
                  <label key={p.key} className="check" title={p.key}>
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(p.key)}
                      disabled={!grantable.includes(p.key)}
                      onChange={(e) => togglePerm(p.key, e.target.checked)}
                    />{' '}
                    {p.label}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn primary" disabled={pending}>Save role</button>
          </div>
        </form>
      )}

      <div className="grid-2">
        {roles.map((role) => (
          <div key={role.id} className="card">
            <div className="card-head">
              <div>
                <h2>
                  {role.name}{' '}
                  {role.is_admin ? <span className="badge primary">Root</span> : role.is_default && <span className="badge">Default</span>}
                </h2>
                <p className="small muted">{role.description || '—'} · {role.member_count} member(s)</p>
              </div>
              {canManage && !role.is_admin && (
                <div className="row">
                  <button className="btn sm" onClick={() => edit(role)}>Edit</button>
                  {!role.is_default && <button className="btn sm danger" onClick={() => remove(role)}>Delete</button>}
                </div>
              )}
            </div>
            <div className="card-body">
              {role.is_admin ? (
                <p className="muted">All permissions in this estate. This role cannot be changed.</p>
              ) : role.permissions.length ? (
                <div className="row">{role.permissions.map((p) => <span key={p} className="badge">{labelFor(p)}</span>)}</div>
              ) : (
                <p className="muted">No permissions.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
