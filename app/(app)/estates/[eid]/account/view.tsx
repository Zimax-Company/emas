'use client'

import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { toMinor } from '@/lib/format'
import { FormError } from '@/components/FormError'

const CATEGORIES = {
  income: ['Levy', 'Donation', 'Rental income', 'Other income'],
  expense: ['Security', 'Cleaning', 'Electricity', 'Water', 'Repairs & maintenance', 'Staff salaries', 'Admin', 'Other expense'],
}
const blank = { type: 'expense', category: '', amount: '', description: '', reference: '', occurred_at: '' }

/** Page header with the "Record transaction" toggle and form. */
export function RecordTx({ eid, currency, canManage }: { eid: string; currency: string; canManage: boolean }) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState(blank)
  const { pending, error, run } = useAction()
  const field = (k: keyof typeof blank) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value }),
  })

  async function create(e: React.FormEvent) {
    e.preventDefault()
    await run(async () => {
      await apiCall('POST', `/estates/${eid}/account`, {
        type: form.type,
        category: form.category,
        amount: toMinor(form.amount),
        description: form.description || null,
        reference: form.reference || null,
        ...(form.occurred_at ? { occurred_at: form.occurred_at } : {}),
      })
      setForm(blank)
      setShow(false)
    })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Estate account</h1>
          <p className="muted">Income and expenses. Residence payments are recorded here automatically.</p>
        </div>
        {canManage && <button className="btn primary" onClick={() => setShow(!show)}>{show ? 'Cancel' : 'Record transaction'}</button>}
      </div>
      <FormError error={error} />
      {show && (
        <form className="card card-body form" onSubmit={create}>
          <div className="form-grid">
            <label>
              Type
              <select {...field('type')}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>
            <label>
              Category
              <input list="categories" required {...field('category')} />
              <datalist id="categories">
                {CATEGORIES[form.type as 'income' | 'expense'].map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
            <label>Amount ({currency}) <input type="number" min="0.01" step="0.01" required {...field('amount')} /></label>
            <label>Date <input type="date" {...field('occurred_at')} /></label>
          </div>
          <div className="form-grid">
            <label>Description <input {...field('description')} /></label>
            <label>Reference <input {...field('reference')} /></label>
          </div>
          <div className="actions"><button className="btn primary" disabled={pending}>Save</button></div>
        </form>
      )}
    </>
  )
}

export function DeleteTx({ eid, id }: { eid: string; id: number }) {
  const { pending, error, run } = useAction()
  return (
    <button
      className="btn sm danger"
      disabled={pending}
      title={error ?? undefined}
      onClick={() => confirm('Delete this transaction?') && run(() => apiCall('DELETE', `/estates/${eid}/account/${id}`))}
    >
      {error ? 'Failed' : 'Delete'}
    </button>
  )
}
