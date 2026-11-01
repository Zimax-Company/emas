import { db } from './db'

/** Estate members with their roles and residences. Pass memberId to fetch one. */
export async function listMembers(estateId: number, memberId?: number) {
  const q = db('estate_members as m')
    .join('users as u', 'u.id', 'm.user_id')
    .where('m.estate_id', estateId)
    .select('m.id', 'm.user_id', 'u.name', 'u.email', 'u.phone', 'u.is_active', 'm.created_at')
    .orderBy('u.name')
  if (memberId) q.andWhere('m.id', memberId)
  const members = await q
  if (!members.length) return []

  const memberIds = members.map((m) => m.id)
  const userIds = members.map((m) => m.user_id)
  const [roles, residences] = await Promise.all([
    db('estate_member_roles as mr')
      .join('roles as r', 'r.id', 'mr.role_id')
      .whereIn('mr.estate_member_id', memberIds)
      .select('mr.estate_member_id', 'r.id', 'r.name', 'r.slug', 'r.is_admin'),
    db('residence_residents as rr')
      .join('residences as r', 'r.id', 'rr.residence_id')
      .where('r.estate_id', estateId)
      .whereIn('rr.user_id', userIds)
      .select('rr.user_id', 'r.id', 'r.name'),
  ])

  return members.map((m) => ({
    ...m,
    is_active: Boolean(m.is_active),
    roles: roles
      .filter((r) => r.estate_member_id === m.id)
      .map((r) => ({ id: r.id, name: r.name, slug: r.slug, is_admin: Boolean(r.is_admin) })),
    residences: residences.filter((r) => r.user_id === m.user_id).map((r) => ({ id: r.id, name: r.name })),
  }))
}
