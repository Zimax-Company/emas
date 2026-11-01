import { db } from '@/lib/db'
import { can, estateContext } from '@/lib/rbac'
import { handle, ok } from '@/lib/http'
import { estateAccountSummary, residenceBalances } from '@/lib/ledger'

type P = { eid: string }

/** One dashboard per estate; sections appear according to the caller's permissions. */
export const GET = handle<P>(async (req, { eid }) => {
  const ctx = await estateContext(req, eid)
  const estateId = ctx.estate.id
  const data: Record<string, unknown> = {}

  if (can(ctx, 'residences.view')) {
    const [r] = await db('residences').where({ estate_id: estateId }).count({ n: '*' })
    data.residence_count = Number(r.n)
  }
  if (can(ctx, 'members.view')) {
    const [m] = await db('estate_members').where({ estate_id: estateId }).count({ n: '*' })
    data.member_count = Number(m.n)
  }

  if (can(ctx, 'estate_accounts.view')) {
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    const [month, allTime, recent] = await Promise.all([
      estateAccountSummary(estateId, monthStart),
      estateAccountSummary(estateId),
      db('estate_transactions').where({ estate_id: estateId }).orderBy('occurred_at', 'desc').limit(5),
    ])
    data.finance = { this_month: month, balance: allTime.net, recent_transactions: recent }
  }

  if (can(ctx, 'residence_accounts.view')) {
    const residences = await db('residences').where({ estate_id: estateId }).select('id', 'name')
    const balance = await residenceBalances(estateId)
    const owing = residences
      .map((r) => ({ ...r, balance: balance(r.id).balance }))
      .filter((r) => r.balance > 0)
      .sort((a, b) => b.balance - a.balance)
    data.receivables = {
      outstanding_total: owing.reduce((s, r) => s + r.balance, 0),
      residences_owing: owing.length,
      top_owing: owing.slice(0, 5),
    }
  }

  if (can(ctx, 'announcements.view')) {
    data.recent_announcements = await db('announcements')
      .where({ estate_id: estateId })
      .orderBy('published_at', 'desc')
      .limit(5)
      .select('id', 'title', 'published_at')
  }

  if (can(ctx, 'dues.view')) {
    data.active_dues = await db('dues')
      .where({ estate_id: estateId, status: 'active' })
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('id', 'title', 'amount', 'frequency', 'due_date')
  }

  if (ctx.residenceIds.length) {
    const [residences, unread, balance] = await Promise.all([
      db('residences').whereIn('id', ctx.residenceIds).select('id', 'name', 'address_line1'),
      db('inbox_messages')
        .whereIn('residence_id', ctx.residenceIds)
        .whereNull('read_at')
        .groupBy('residence_id')
        .select('residence_id', db.raw('count(*) as n')),
      residenceBalances(estateId, ctx.residenceIds),
    ])
    data.my_residences = residences.map((r) => ({
      ...r,
      unread_count: Number(unread.find((u) => u.residence_id === r.id)?.n ?? 0),
      account: balance(r.id),
    }))
  }

  return ok({ estate: ctx.estate, ...data })
})
