'use client'

import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { FormError } from '@/components/FormError'

export function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [done, setDone] = useState(false)
  const { pending, error, run } = useAction()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setDone(false)
    await run(async () => {
      await apiCall('PUT', '/auth/password', { current_password: current, new_password: next })
      setCurrent('')
      setNext('')
      setDone(true)
    }, { refresh: false })
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Change password</h2>
      </div>
      <form className="card-body form" onSubmit={submit}>
        <FormError error={error} />
        {done && <div className="alert success">Password updated.</div>}
        <label>
          Current password <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label>
          New password <input type="password" minLength={8} autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <div className="actions">
          <button className="btn primary" disabled={pending}>Update password</button>
        </div>
      </form>
    </div>
  )
}
