import type { Knex } from 'knex'
import { z } from 'zod'
import { hashPassword, randomPassword, toUser, USER_COLUMNS } from './auth'

export const newUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email().transform((e) => e.toLowerCase()),
  phone: z.string().trim().max(40).optional().nullable(),
  password: z.string().min(8).optional(),
})

export type NewUser = z.infer<typeof newUserSchema>

/**
 * Returns the user with this email, creating one if needed.
 * When a user is created without a password, a temporary one is generated and returned once.
 */
export async function findOrCreateUser(trx: Knex | Knex.Transaction, input: NewUser) {
  const existing = await trx('users').select(USER_COLUMNS).where({ email: input.email }).first()
  if (existing) return { user: toUser(existing), created: false, temporary_password: null as string | null }

  const temporary = input.password ? null : randomPassword()
  const [userId] = await trx('users').insert({
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    password_hash: await hashPassword(input.password ?? temporary!),
  })
  const row = await trx('users').select(USER_COLUMNS).where({ id: userId }).first()
  return { user: toUser(row), created: true, temporary_password: temporary }
}

/** Ensures the user is a member of the estate and holds the given roles. Returns the member id. */
export async function addMember(trx: Knex | Knex.Transaction, estateId: number, userId: number, roleIds: number[]) {
  await trx('estate_members').insert({ estate_id: estateId, user_id: userId }).onConflict(['estate_id', 'user_id']).ignore()
  const member = await trx('estate_members').where({ estate_id: estateId, user_id: userId }).first('id')
  if (roleIds.length) {
    await trx('estate_member_roles')
      .insert(roleIds.map((role_id) => ({ estate_member_id: member.id, role_id })))
      .onConflict(['estate_member_id', 'role_id'])
      .ignore()
  }
  return Number(member.id)
}
