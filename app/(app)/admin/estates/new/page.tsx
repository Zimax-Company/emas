import type { Metadata } from 'next'
import { requireSystemAdminPage } from '@/lib/server'
import { NewEstateForm } from './form'

export const metadata: Metadata = { title: 'New estate' }

export default async function NewEstatePage() {
  await requireSystemAdminPage()
  return (
    <main className="content stack" style={{ margin: '0 auto', maxWidth: 640 }}>
      <div className="page-head">
        <div>
          <h1>New estate</h1>
          <p className="muted">
            The estate gets its own dashboard and the default <b>Estate Admin</b> and <b>Resident</b> roles.
          </p>
        </div>
      </div>
      <NewEstateForm />
    </main>
  )
}
