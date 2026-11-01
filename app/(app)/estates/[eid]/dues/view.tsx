'use client'

import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { date, FREQUENCY_LABELS, money, toMinor } from '@/lib/format'
import type { Due } from '@/lib/types'
import { FormError } from '@/components/FormError'

const blank = { title: '', description: '', amount: '', frequency: 'monthly', due_date: '' }

export function DuesView({ eid, dues, currency, canManage }: { eid: string; dues: Due[]; currency: string; canManage: boolean }) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(blank)
  const [notice, setNotice] = useState<string | null>(null)
  const { pending, error, run } = useAction()
  const m = (v: number) => money(v, currency)
  const field = (k: keyof typeof blank) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value }),
  })

  async function create(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      await apiCall('POST', `/estates/${eid}/dues`, {
        title: form.title,
        description: form.description || null,
        amount: toMinor(form.amount),
        frequency: form.frequency,
        due_date: form.due_date || null,
      })
      setForm(blank)
      setShow(false)
    })
  }

  async function charge(d: Due) {
    const period = d.frequency === 'one_time' ? 'once' : prompt(`Charge "${d.title}" to every residence for period:`, d.current_period)
    if (!period) return
    await run(async () => {
      const res = await apiCall<{ charged: number; skipped: number; period: string }>('POST', `/estates/${eid}/dues/${d.id}/charge`, { period })
      setNotice(`${d.title} (${res.period}): charged ${res.charged} residence(s)${res.skipped ? `, ${res.skipped} already charged` : ''}.`)
    })
  }

  const setStatus = (d: Due, status: Due['status']) => run(() => apiCall('PATCH', `/estates/${eid}/dues/${d.id}`, { status }))

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Dues</h1>
          <p className="muted">Charging a due posts it to every residence account for the billing period.</p>
        </div>
        {canManage && <button className="btn primary" onClick={() => setShow(!show)}>{show ? 'Cancel' : 'New due'}</button>}
      </div>
      <FormError error={error} />
      {notice && <div className="alert success">{notice}</div>}

      {show && (
        <form className="card card-body form" onSubmit={create}>
          <div className="form-grid">
            <label>Title <input placeholder="e.g. Service charge" required {...field('title')} /></label>
            <label>Amount ({currency}) <input type="number" min="0.01" step="0.01" required {...field('amount')} /></label>
            <label>
              Frequency
              <select {...field('frequency')}>
                {Object.entries(FREQUENCY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label>Due date <input type="date" {...field('due_date')} /></label>
          </div>
          <label>Description <textarea rows={2} {...field('description')} /></label>
          <div className="actions"><button className="btn primary" disabled={pending}>Create due</button></div>
        </form>
      )}

      <div className="card">
        <div className="table-wrap">
          {dues.length ? (
            <table>
              <thead>
                <tr><th>Due</th><th>Frequency</th><th className="num">Amount</th><th className="num">Charged to date</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {dues.map((d) => (
                  <tr key={d.id}>
                    <td>
                      {d.title}
                      {d.description && <div className="small muted">{d.description}</div>}
                      {d.due_date && <div className="small muted">Due {date(d.due_date)}</div>}
                    </td>
                    <td>{FREQUENCY_LABELS[d.frequency]}</td>
                    <td className="num">{m(d.amount)}</td>
                    <td className="num">{m(d.charged_total)}<div className="small muted">{d.charge_count} charge(s)</div></td>
                    <td><span className={`badge ${d.status === 'active' ? 'success' : ''}`}>{d.status}</span></td>
                    <td className="actions">
                      {canManage && (
                        <>
                          {d.status === 'active' && <button className="btn sm primary" onClick={() => charge(d)}>Charge residences</button>}
                          <button className="btn sm" onClick={() => setStatus(d, d.status === 'active' ? 'archived' : 'active')}>
                            {d.status === 'active' ? 'Archive' : 'Restore'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No dues yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
