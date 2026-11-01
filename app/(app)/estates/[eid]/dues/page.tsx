import type { Metadata } from 'next'
import { GET } from '@/app/api/estates/[eid]/dues/route'
import { can, getEstate, load } from '@/lib/server'
import type { Due } from '@/lib/types'
import { Forbidden } from '@/components/Forbidden'
import { DuesView } from './view'

export const metadata: Metadata = { title: 'Dues' }

export default async function DuesPage({ params }: { params: Promise<{ eid: string }> }) {
  const { eid } = await params
  const e = await getEstate(eid)
  if (!can(e, 'dues.view')) return <Forbidden />
  const dues = await load<Due[], { eid: string }>(GET, { eid })
  return <DuesView eid={eid} dues={dues} currency={e.estate.currency} canManage={can(e, 'dues.manage')} />
}
