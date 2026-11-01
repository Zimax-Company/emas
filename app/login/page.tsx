import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="card-body form">
          <div>
            <div className="brand" style={{ fontSize: 22 }}>
              EM<span>AS</span>
            </div>
            <p className="muted">Estate management, sign in to continue.</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
