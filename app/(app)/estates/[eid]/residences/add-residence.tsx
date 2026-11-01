'use client'

import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { FormError } from '@/components/FormError'

const blank = { name: '', address_line1: '', address_line2: '', city: '', state: '', postal_code: '', contact_name: '', contact_phone: '', contact_email: '' }

/** Page header with the "Add residence" toggle and form. */
export function AddResidence({ eid, canManage, children }: { eid: string; canManage: boolean; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(blank)
  const { pending, error, run } = useAction()
  const field = (k: keyof typeof blank) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }) })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      const { contact_name, contact_phone, contact_email, ...residence } = form
      await apiCall('POST', `/estates/${eid}/residences`, {
        ...residence,
        contacts: contact_name
          ? [{ name: contact_name, phone: contact_phone || null, email: contact_email || null, relationship: 'owner', is_primary: true }]
          : [],
      })
      setForm(blank)
      setShow(false)
    })
  }

  return (
    <>
      <div className="page-head">
        {children}
        {canManage && (
          <button className="btn primary" onClick={() => setShow(!show)}>
            {show ? 'Cancel' : 'Add residence'}
          </button>
        )}
      </div>
      {show && (
        <form className="card card-body form" onSubmit={submit}>
          <FormError error={error} />
          <div className="form-grid">
            <label>Name <input placeholder="e.g. Block A, Flat 3" required {...field('name')} /></label>
            <label>Address line 1 <input required {...field('address_line1')} /></label>
            <label>Address line 2 <input {...field('address_line2')} /></label>
            <label>City <input {...field('city')} /></label>
            <label>State <input {...field('state')} /></label>
            <label>Postal code <input {...field('postal_code')} /></label>
          </div>
          <h3>Primary contact <span className="muted small">(optional)</span></h3>
          <div className="form-grid">
            <label>Name <input {...field('contact_name')} /></label>
            <label>Phone <input {...field('contact_phone')} /></label>
            <label>Email <input type="email" {...field('contact_email')} /></label>
          </div>
          <div className="actions">
            <button className="btn primary" disabled={pending}>Save residence</button>
          </div>
        </form>
      )}
    </>
  )
}
