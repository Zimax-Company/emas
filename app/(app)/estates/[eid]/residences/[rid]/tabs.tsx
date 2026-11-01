'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { date, money, toMinor } from '@/lib/format'
import type { Contact, InboxMessage, Residence, ResidenceLedger, VisitorPass } from '@/lib/types'
import { FormError } from '@/components/FormError'
import { VisitorStatus } from '@/components/VisitorStatus'

const divider = { borderTop: '1px solid var(--border)' }

export function OverviewTab({ apiPath, residencesPath, residence: r, canManageMembers }: {
  apiPath: string; residencesPath: string; residence: Residence; canManageMembers: boolean
}) {
  const router = useRouter()
  const { pending, error, run } = useAction()
  const manage = r.access.can_manage

  const [editing, setEditing] = useState(false)
  const [details, setDetails] = useState({ name: '', address_line1: '', address_line2: '', city: '', state: '', postal_code: '' })
  const detail = (k: keyof typeof details) => ({ value: details[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDetails({ ...details, [k]: e.target.value }) })

  const blankContact = { name: '', phone: '', email: '', relationship: 'owner', is_primary: false }
  const [contact, setContact] = useState(blankContact)
  const [resident, setResident] = useState({ name: '', email: '' })
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  function startEdit() {
    setDetails({
      name: r.name, address_line1: r.address_line1, address_line2: r.address_line2 ?? '',
      city: r.city ?? '', state: r.state ?? '', postal_code: r.postal_code ?? '',
    })
    setEditing(true)
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      await apiCall('PATCH', apiPath, details)
      setEditing(false)
    })
  }

  async function removeResidence() {
    if (!confirm(`Delete ${r.name}? Its contacts, inbox and account history will be removed.`)) return
    await run(async () => {
      await apiCall('DELETE', apiPath)
      router.push(residencesPath)
    }, { refresh: false })
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      await apiCall('POST', `${apiPath}/contacts`, { ...contact, phone: contact.phone || null, email: contact.email || null })
      setContact(blankContact)
    })
  }

  const makePrimary = (c: Contact) => run(() => apiCall('PATCH', `${apiPath}/contacts/${c.id}`, { is_primary: true }))
  const removeContact = (c: Contact) => confirm(`Remove ${c.name}?`) && run(() => apiCall('DELETE', `${apiPath}/contacts/${c.id}`))

  async function addResident(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      const res = await apiCall<{ temporary_password: string | null }>('POST', `${apiPath}/residents`, resident)
      setTempPassword(res.temporary_password)
      setResident({ name: '', email: '' })
    })
  }

  const removeResident = (id: number) => confirm('Unlink this resident from the residence?') && run(() => apiCall('DELETE', `${apiPath}/residents/${id}`))

  return (
    <>
      <FormError error={error} />
      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h2>Details</h2>
            {manage && (
              <div className="row">
                {!editing && <button className="btn sm" onClick={startEdit}>Edit</button>}
                <button className="btn sm danger" onClick={removeResidence}>Delete</button>
              </div>
            )}
          </div>
          {editing ? (
            <form className="card-body form" onSubmit={saveDetails}>
              <label>Name <input required {...detail('name')} /></label>
              <label>Address line 1 <input required {...detail('address_line1')} /></label>
              <label>Address line 2 <input {...detail('address_line2')} /></label>
              <div className="form-grid">
                <label>City <input {...detail('city')} /></label>
                <label>State <input {...detail('state')} /></label>
                <label>Postal code <input {...detail('postal_code')} /></label>
              </div>
              <div className="actions">
                <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
                <button className="btn primary" disabled={pending}>Save</button>
              </div>
            </form>
          ) : (
            <table>
              <tbody>
                <tr><th style={{ width: 140 }}>Name</th><td>{r.name}</td></tr>
                <tr><th>Address</th><td>{r.address_line1}{r.address_line2 && <><br />{r.address_line2}</>}</td></tr>
                <tr><th>City / State</th><td>{[r.city, r.state].filter(Boolean).join(', ') || '—'}</td></tr>
                <tr><th>Postal code</th><td>{r.postal_code || '—'}</td></tr>
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Residents</h2>
            <span className="small muted">Accounts with access to this residence</span>
          </div>
          {r.residents.length ? (
            <table>
              <tbody>
                {r.residents.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}<div className="small muted">{u.email}</div></td>
                    <td className="num">{manage && <button className="btn sm danger" onClick={() => removeResident(u.id)}>Unlink</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No resident accounts linked.</div>
          )}
          {manage && canManageMembers && (
            <form className="card-body form" style={divider} onSubmit={addResident}>
              {tempPassword && <div className="alert success">Account created. Temporary password: <code>{tempPassword}</code></div>}
              <div className="form-grid">
                <input placeholder="Name" required value={resident.name} onChange={(e) => setResident({ ...resident, name: e.target.value })} />
                <input type="email" placeholder="Email" required value={resident.email} onChange={(e) => setResident({ ...resident, email: e.target.value })} />
              </div>
              <div className="actions"><button className="btn sm primary" disabled={pending}>Add resident</button></div>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>Contacts</h2></div>
        <div className="table-wrap">
          {r.contacts.length ? (
            <table>
              <thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th><th /></tr></thead>
              <tbody>
                {r.contacts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name} {c.is_primary && <span className="badge primary">Primary</span>}</td>
                    <td style={{ textTransform: 'capitalize' }}>{c.relationship}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td className="actions">
                      {manage && (
                        <>
                          {!c.is_primary && <button className="btn sm" onClick={() => makePrimary(c)}>Make primary</button>}
                          <button className="btn sm danger" onClick={() => removeContact(c)}>Remove</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No contacts yet.</div>
          )}
        </div>
        {manage && (
          <form className="card-body form" style={divider} onSubmit={addContact}>
            <div className="form-grid">
              <input placeholder="Name" required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              <input placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              <input type="email" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              <select value={contact.relationship} onChange={(e) => setContact({ ...contact, relationship: e.target.value })}>
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
                <option value="family">Family</option>
                <option value="emergency">Emergency</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="row between">
              <label className="check">
                <input type="checkbox" checked={contact.is_primary} onChange={(e) => setContact({ ...contact, is_primary: e.target.checked })} /> Primary contact
              </label>
              <button className="btn sm primary" disabled={pending}>Add contact</button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}

export function InboxTab({ apiPath, messages, isResident }: { apiPath: string; messages: InboxMessage[]; isResident: boolean }) {
  const { run } = useAction()
  const markRead = (msg: InboxMessage) => {
    if (msg.read_at || !isResident) return
    run(() => apiCall('PATCH', `${apiPath}/inbox/${msg.id}`))
  }

  return (
    <div className="card">
      {!messages.length && <div className="empty">The inbox is empty.</div>}
      {messages.map((msg) => (
        <div key={msg.id} className={`message${msg.read_at ? '' : ' unread'}`} onClick={() => markRead(msg)}>
          <div className="row between">
            <h3>{msg.title}</h3>
            <span className="small muted">{date(msg.published_at, true)}</span>
          </div>
          <div className="small muted">
            From {msg.author_name || 'Estate management'}
            {!msg.read_at && isResident && ' · click to mark as read'}
          </div>
          <div className="body">{msg.body}</div>
        </div>
      ))}
    </div>
  )
}

export function AccountTab({ apiPath, ledger, currency, canManage }: { apiPath: string; ledger: ResidenceLedger; currency: string; canManage: boolean }) {
  const blank = { type: 'payment', amount: '', description: '', reference: '', occurred_at: '' }
  const [tx, setTx] = useState(blank)
  const { pending, error, run } = useAction()
  const m = (v: number) => money(v, currency)
  const field = (k: keyof typeof blank) => ({ value: tx[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setTx({ ...tx, [k]: e.target.value }) })

  async function record(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      await apiCall('POST', `${apiPath}/transactions`, {
        type: tx.type,
        amount: toMinor(tx.amount),
        description: tx.description || null,
        reference: tx.reference || null,
        ...(tx.occurred_at ? { occurred_at: tx.occurred_at } : {}),
      })
      setTx(blank)
    })
  }

  return (
    <>
      <div className="grid">
        <div className="card stat"><div className="label">Total charged</div><div className="value">{m(ledger.summary.charged)}</div></div>
        <div className="card stat"><div className="label">Total paid &amp; credited</div><div className="value pos">{m(ledger.summary.paid)}</div></div>
        <div className="card stat">
          <div className="label">Balance owed</div>
          <div className={`value ${ledger.summary.balance > 0 ? 'neg' : 'pos'}`}>{m(ledger.summary.balance)}</div>
        </div>
      </div>

      {canManage && (
        <form className="card card-body form" onSubmit={record}>
          <h2>Record transaction</h2>
          <FormError error={error} />
          <div className="form-grid">
            <label>
              Type
              <select {...field('type')}>
                <option value="payment">Payment (adds estate income)</option>
                <option value="credit">Credit / waiver</option>
                <option value="charge">Manual charge</option>
              </select>
            </label>
            <label>Amount ({currency}) <input type="number" min="0.01" step="0.01" required {...field('amount')} /></label>
            <label>Date <input type="date" {...field('occurred_at')} /></label>
            <label>Reference <input placeholder="Receipt / transfer ref" {...field('reference')} /></label>
          </div>
          <label>Description <input {...field('description')} /></label>
          <div className="actions"><button className="btn primary" disabled={pending}>Record</button></div>
        </form>
      )}

      <div className="card">
        <div className="card-head"><h2>Transactions</h2></div>
        <div className="table-wrap">
          {ledger.transactions.length ? (
            <table>
              <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Reference</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {ledger.transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="muted">{date(t.occurred_at)}</td>
                    <td>{t.description || t.due_title || '—'}{t.recorded_by_name && <div className="small muted">by {t.recorded_by_name}</div>}</td>
                    <td><span className={`badge ${t.type === 'charge' ? 'warning' : 'success'}`}>{t.type}</span></td>
                    <td className="muted">{t.reference || '—'}</td>
                    <td className={`num ${t.type === 'charge' ? 'neg' : 'pos'}`}>{t.type === 'charge' ? '' : '−'}{m(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No transactions yet.</div>
          )}
        </div>
      </div>
    </>
  )
}

const VALIDITY = [[2, '2 hours'], [6, '6 hours'], [12, '12 hours'], [24, '1 day'], [48, '2 days'], [72, '3 days'], [168, '1 week']] as const

function shareText(p: VisitorPass) {
  return `Visitor pass for ${p.visitor_name} (${p.residence_name})\nIN code: ${p.entry_code}\nOUT code: ${p.exit_code}\nValid ${date(p.valid_from, true)} – ${date(p.expires_at, true)}. Each code works once.`
}

export function VisitorsTab({ apiPath, passes, canIssue }: { apiPath: string; passes: VisitorPass[]; canIssue: boolean }) {
  const blank = { visitor_name: '', visitor_phone: '', purpose: '', valid_from: '', valid_hours: '24' }
  const [form, setForm] = useState(blank)
  const [issued, setIssued] = useState<VisitorPass | null>(null)
  const [copied, setCopied] = useState(false)
  const { pending, error, run } = useAction()
  const field = (k: keyof typeof blank) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value }) })

  async function issue(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      const pass = await apiCall<VisitorPass>('POST', `${apiPath}/visitors`, {
        visitor_name: form.visitor_name,
        visitor_phone: form.visitor_phone || null,
        purpose: form.purpose || null,
        valid_hours: Number(form.valid_hours),
        // datetime-local is in the browser's time zone; send an absolute time.
        ...(form.valid_from ? { valid_from: new Date(form.valid_from).toISOString() } : {}),
      })
      setIssued(pass)
      setCopied(false)
      setForm(blank)
    })
  }

  async function copy(p: VisitorPass) {
    try {
      await navigator.clipboard.writeText(shareText(p))
      setCopied(true)
    } catch {
      prompt('Copy the visitor codes:', shareText(p))
    }
  }

  const cancel = (p: VisitorPass) => confirm(`Cancel the pass for ${p.visitor_name}? Both codes will stop working.`) && run(() => apiCall('DELETE', `${apiPath}/visitors/${p.id}`))

  return (
    <>
      {canIssue && (
        <form className="card card-body form" onSubmit={issue}>
          <h2>Generate visitor codes</h2>
          <p className="small muted">Your visitor gets an IN code for the gate on arrival and an OUT code for when they leave. Each code works only once.</p>
          <FormError error={error} />
          <div className="form-grid">
            <label>Visitor name <input required {...field('visitor_name')} /></label>
            <label>Phone <input {...field('visitor_phone')} /></label>
            <label>Purpose <input placeholder="e.g. Family visit, delivery" {...field('purpose')} /></label>
          </div>
          <div className="form-grid">
            <label>Valid from <input type="datetime-local" {...field('valid_from')} /><span className="small muted">Leave empty for now</span></label>
            <label>
              Valid for
              <select {...field('valid_hours')}>
                {VALIDITY.map(([h, label]) => <option key={h} value={h}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="actions"><button className="btn primary" disabled={pending}>Generate codes</button></div>
        </form>
      )}

      {issued && (
        <div className="alert success">
          <div className="row between">
            <div>
              Codes for <strong>{issued.visitor_name}</strong>: IN <span className="code">{issued.entry_code}</span> · OUT <span className="code">{issued.exit_code}</span>
              <div className="small">Valid until {date(issued.expires_at, true)}. Share them with your visitor.</div>
            </div>
            <button type="button" className="btn sm" onClick={() => copy(issued)}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h2>Visitor passes</h2></div>
        <div className="table-wrap">
          {passes.length ? (
            <table>
              <thead><tr><th>Visitor</th><th>Valid</th><th>Codes</th><th>Status</th><th>Gate</th><th /></tr></thead>
              <tbody>
                {passes.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.visitor_name}
                      <div className="small muted">{[p.visitor_phone, p.purpose].filter(Boolean).join(' · ') || '—'}</div>
                    </td>
                    <td className="small">{date(p.valid_from, true)}<div className="muted">to {date(p.expires_at, true)}</div></td>
                    <td>
                      {p.entry_code ? (
                        <>
                          <div><span className="small muted">IN </span><span className={`code${p.checked_in_at || p.status === 'cancelled' || p.status === 'expired' ? ' used' : ''}`}>{p.entry_code}</span></div>
                          <div><span className="small muted">OUT </span><span className={`code${p.checked_out_at || p.status === 'cancelled' || p.status === 'expired' ? ' used' : ''}`}>{p.exit_code}</span></div>
                        </>
                      ) : <span className="muted">Hidden</span>}
                    </td>
                    <td><VisitorStatus status={p.status} /></td>
                    <td className="small">
                      {p.checked_in_at ? <>In {date(p.checked_in_at, true)}</> : '—'}
                      {p.checked_out_at && <div>Out {date(p.checked_out_at, true)}</div>}
                    </td>
                    <td className="actions">
                      {canIssue && p.entry_code && (p.status === 'active' || p.status === 'upcoming') && (
                        <>
                          <button className="btn sm" onClick={() => copy(p)}>Copy</button>
                          <button className="btn sm danger" onClick={() => cancel(p)}>Cancel</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">No visitor passes yet.</div>
          )}
        </div>
      </div>
    </>
  )
}
