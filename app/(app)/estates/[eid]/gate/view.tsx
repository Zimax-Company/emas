'use client'

import { useRef, useState } from 'react'
import { apiCall, useAction } from '@/lib/client'
import { date } from '@/lib/format'
import type { VisitorPass } from '@/lib/types'
import { FormError } from '@/components/FormError'

type Result = { direction: 'in' | 'out'; pass: VisitorPass }

export function ValidateCode({ eid }: { eid: string }) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const { pending, error, run } = useAction()

  async function validate(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)
    const res = await run(() => apiCall<Result>('POST', `/estates/${eid}/visitors/validate`, { code }))
    if (res) setResult(res)
    setCode('')
    input.current?.focus()
  }

  const p = result?.pass
  return (
    <form className="card card-body form" onSubmit={validate}>
      <h2>Validate a code</h2>
      <div className="row">
        <input
          ref={input}
          className="code-input"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          required
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          aria-label="Visitor code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <button className="btn primary" disabled={pending || code.length !== 6}>Validate</button>
      </div>
      <FormError error={error} />
      {p && (
        <div className="alert success">
          <strong>{result.direction === 'in' ? 'Checked IN' : 'Checked OUT'}: {p.visitor_name}</strong>
          <div>Visiting {p.residence_name}{p.purpose && ` · ${p.purpose}`}{p.visitor_phone && ` · ${p.visitor_phone}`}</div>
          <div className="small">
            Pass issued by {p.created_by_name || '—'}, valid until {date(p.expires_at, true)}
            {result.direction === 'out' && new Date(p.expires_at) < new Date() && ' (overstayed)'}
          </div>
        </div>
      )}
    </form>
  )
}
