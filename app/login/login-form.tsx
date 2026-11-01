'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { FormError } from '@/components/FormError'

export function LoginForm() {
  const router = useRouter()
  const next = useSearchParams().get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { pending, error, run } = useAction()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await run(
      async () => {
        await apiCall('POST', '/auth/login', { email, password })
        router.replace(next?.startsWith('/') && !next.startsWith('//') ? next : '/')
        router.refresh()
      },
      { refresh: false },
    )
  }

  return (
    <form className="form" onSubmit={submit}>
      <FormError error={error} />
      <label>
        Email <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password{' '}
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button className="btn primary" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
