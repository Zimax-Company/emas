'use client'

import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { date } from '@/lib/format'
import type { Announcement } from '@/lib/types'
import { FormError } from '@/components/FormError'

const blank = { title: '', body: '', audience: 'all' as 'all' | 'selected', residence_ids: [] as number[] }

export function AnnouncementsView({ eid, list, residences, canPublish }: {
  eid: string; list: Announcement[]; residences: { id: number; name: string }[]; canPublish: boolean
}) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(blank)
  const [sent, setSent] = useState<number | null>(null)
  const { pending, error, run } = useAction()

  async function publish(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      const res = await apiCall<{ recipients: number }>('POST', `/estates/${eid}/announcements`, form)
      setSent(res.recipients)
      setForm(blank)
      setShow(false)
    })
  }

  const retract = (a: Announcement) =>
    confirm(`Retract "${a.title}" from every inbox?`) && run(() => apiCall('DELETE', `/estates/${eid}/announcements/${a.id}`))

  const toggleResidence = (id: number, on: boolean) =>
    setForm({ ...form, residence_ids: on ? [...form.residence_ids, id] : form.residence_ids.filter((r) => r !== id) })

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Announcements</h1>
          <p className="muted">Published announcements land in each residence&apos;s inbox.</p>
        </div>
        {canPublish && <button className="btn primary" onClick={() => setShow(!show)}>{show ? 'Cancel' : 'New announcement'}</button>}
      </div>
      <FormError error={error} />
      {sent !== null && <div className="alert success">Announcement delivered to {sent} residence inbox(es).</div>}

      {show && (
        <form className="card card-body form" onSubmit={publish}>
          <label>Title <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>Message <textarea rows={6} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
          <div className="row">
            <label className="check">
              <input type="radio" checked={form.audience === 'all'} onChange={() => setForm({ ...form, audience: 'all' })} /> All residences
            </label>
            <label className="check">
              <input type="radio" checked={form.audience === 'selected'} onChange={() => setForm({ ...form, audience: 'selected' })} /> Selected residences
            </label>
          </div>
          {form.audience === 'selected' && (
            <div className="card card-body" style={{ maxHeight: 220, overflow: 'auto', boxShadow: 'none' }}>
              {residences.map((r) => (
                <label key={r.id} className="check">
                  <input type="checkbox" checked={form.residence_ids.includes(r.id)} onChange={(e) => toggleResidence(r.id, e.target.checked)} /> {r.name}
                </label>
              ))}
              {!residences.length && <p className="muted">No residences yet.</p>}
            </div>
          )}
          <div className="actions"><button className="btn primary" disabled={pending}>Publish</button></div>
        </form>
      )}

      <div className="card">
        {!list.length && <div className="empty">No announcements yet.</div>}
        {list.map((a) => (
          <div key={a.id} className="message">
            <div className="row between">
              <h3>{a.title}</h3>
              <div className="row">
                <span className="small muted">{date(a.published_at, true)}</span>
                {canPublish && <button className="btn sm danger" onClick={() => retract(a)}>Retract</button>}
              </div>
            </div>
            <div className="small muted">
              By {a.author_name || '—'} · {a.audience === 'all' ? 'All residences' : 'Selected residences'} · read by {a.read_count}/{a.recipients}
            </div>
            <div className="body">{a.body}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
