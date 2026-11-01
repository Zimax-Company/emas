import type { Metadata } from 'next'
import { GET as getAnnouncements } from '@/app/api/estates/[eid]/announcements/route'
import { GET as getResidences } from '@/app/api/estates/[eid]/residences/route'
import { can, getEstate, load } from '@/lib/server'
import type { Announcement, ResidenceRow } from '@/lib/types'
import { Forbidden } from '@/components/Forbidden'
import { AnnouncementsView } from './view'

export const metadata: Metadata = { title: 'Announcements' }

export default async function AnnouncementsPage({ params }: { params: Promise<{ eid: string }> }) {
  const { eid } = await params
  const e = await getEstate(eid)
  if (!can(e, 'announcements.view')) return <Forbidden />
  const canPublish = can(e, 'announcements.publish')
  const [list, residences] = await Promise.all([
    load<Announcement[], { eid: string }>(getAnnouncements, { eid }),
    canPublish ? load<ResidenceRow[], { eid: string }>(getResidences, { eid }) : [],
  ])
  return <AnnouncementsView eid={eid} list={list} residences={residences.map((r) => ({ id: r.id, name: r.name }))} canPublish={canPublish} />
}
