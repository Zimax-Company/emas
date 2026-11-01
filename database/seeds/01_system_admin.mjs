import bcrypt from 'bcryptjs'

// Creates the first system admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
// Idempotent: does nothing if that user already exists or the env vars are unset.
/** @param {import('knex').Knex} knex */
export async function seed(knex) {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    console.log('  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set, skipping system admin seed.')
    return
  }
  if (await knex('users').where({ email }).first()) return

  await knex('users').insert({
    name: process.env.SEED_ADMIN_NAME || 'System Admin',
    email,
    password_hash: await bcrypt.hash(password, 10),
    is_system_admin: true,
  })
}
