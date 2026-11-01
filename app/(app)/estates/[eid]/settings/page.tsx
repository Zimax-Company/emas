import type { Metadata } from 'next'
import { can, getEstate, getMe } from '@/lib/server'
import { Forbidden } from '@/components/Forbidden'
import { SettingsForm } from './form'

export const metadata: Metadata = { title: 'Estate settings' }

export default async function SettingsPage({ params }: { params: Promise<{ eid: string }> }) {
  const { eid } = await params
  const [e, me] = await Promise.all([getEstate(eid), getMe()])
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div className="page-head"><h1>Estate settings</h1></div>
      {can(e, 'estate.update') ? <SettingsForm estate={e.estate} canDelete={me.user.is_system_admin} /> : <Forbidden />}
    </div>
  )
}
