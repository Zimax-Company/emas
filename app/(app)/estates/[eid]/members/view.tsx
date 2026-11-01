'use client'

import Link from 'next/link'
import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import type { Member } from '@/lib/types'
import { FormError } from '@/components/FormError'

type Option = { id: number; name: string }
const blank = { name: '', email: '', phone: '', password: '', role_ids: [] as number[], residence_id: '' }

function toggle(ids: number[], id: number, on: boolean) {
  return on ? [...ids, id] : ids.filter((x) => x !== id)
}

export function MembersView({ eid, members, assignable, residences, canManage }: {
  eid: string; members: Member[]; assignable: Option[]; residences: Option[]; canManage: boolean
}) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(blank)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editRoles, setEditRoles] = useState<number[]>([])
  const { pending, error, run } = useAction()
  const base = `/estates/${eid}`

  async function add(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      const res = await apiCall<{ temporary_password: string | null }>('POST', `${base}/members`, {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        ...(form.password ? { password: form.password } : {}),
        role_ids: form.role_ids,
        residence_id: form.residence_id ? Number(form.residence_id) : null,
      })
      setTempPassword(res.temporary_password)
      setForm(blank)
      setShow(false)
    })
  }

  async function saveRoles(m: Member) {
    await run(async () => {
      await apiCall('PATCH', `${base}/members/${m.id}`, { role_ids: editRoles })
      setEditing(null)
    })
  }

  const remove = (m: Member) => confirm(`Remove ${m.name} from this estate?`) && run(() => apiCall('DELETE', `${base}/members/${m.id}`))

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Members</h1>
          <p className="muted">People with access to this estate, and their roles.</p>
        </div>
        {canManage && <button className="btn primary" onClick={() => setShow(!show)}>{show ? 'Cancel' : 'Add member'}</button>}
      </div>
      <FormError error={error} />
      {tempPassword && (
        <div className="alert success">
          Account created. Temporary password: <code>{tempPassword}</code> — share it with the member; it won&apos;t be shown again.
        </div>
      )}

      {show && (
        <form className="card card-body form" onSubmit={add}>
          <div className="form-grid">
            <label>Name <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Email <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Phone <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>
              Password{' '}
              <input type="password" minLength={8} placeholder="Leave blank to generate" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </label>
          </div>
          <div className="form-grid">
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Roles <span className="small muted">(defaults to Resident)</span></div>
              {assignable.map((r) => (
                <label key={r.id} className="check">
                  <input type="checkbox" checked={form.role_ids.includes(r.id)} onChange={(e) => setForm({ ...form, role_ids: toggle(form.role_ids, r.id, e.target.checked) })} /> {r.name}
                </label>
              ))}
            </div>
            <label>
              Link to residence
              <select value={form.residence_id} onChange={(e) => setForm({ ...form, residence_id: e.target.value })}>
                <option value="">None</option>
                {residences.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          </div>
          <p className="small muted">If the email already has an account, it is added to this estate as-is.</p>
          <div className="actions"><button className="btn primary" disabled={pending}>Add member</button></div>
        </form>
      )}

      <div className="card">
        <div className="table-wrap">
          {members.length ? (
            <table>
              <thead><tr><th>Name</th><th>Roles</th><th>Residence</th><th /></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}<div className="small muted">{m.email}</div></td>
                    <td>
                      {editing === m.id
                        ? assignable.map((r) => (
                            <label key={r.id} className="check">
                              <input type="checkbox" checked={editRoles.includes(r.id)} onChange={(e) => setEditRoles(toggle(editRoles, r.id, e.target.checked))} /> {r.name}
                            </label>
                          ))
                        : m.roles.map((r) => (
                            <span key={r.id} className={`badge${r.is_admin ? ' primary' : ''}`} style={{ marginRight: 4 }}>{r.name}</span>
                          ))}
                    </td>
                    <td>
                      {m.residences.map((r) => (
                        <Link key={r.id} href={`${base}/residences/${r.id}`} style={{ marginRight: 6 }}>{r.name}</Link>
                      ))}
                      {!m.residences.length && <span className="muted">—</span>}
                    </td>
                    <td className="actions">
                      {canManage &&
                        (editing === m.id ? (
                          <>
                            <button className="btn sm" onClick={() => setEditing(null)}>Cancel</button>
                            <button className="btn sm primary" disabled={pending || !editRoles.length} onClick={() => saveRoles(m)}>Save</button>
                          </>
                        ) : (
                          <>
                            <button className="btn sm" onClick={() => { setEditing(m.id); setEditRoles(m.roles.map((r) => r.id)) }}>Roles</button>
                            <button className="btn sm danger" onClick={() => remove(m)}>Remove</button>
                          </>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No members yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
