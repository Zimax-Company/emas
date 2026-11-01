/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('users', (t) => {
    t.bigIncrements('id')
    t.string('name', 120).notNullable()
    t.string('email', 191).notNullable().unique()
    t.string('phone', 40).nullable()
    t.string('password_hash', 100).notNullable()
    t.boolean('is_system_admin').notNullable().defaultTo(false)
    t.boolean('is_active').notNullable().defaultTo(true)
    t.timestamp('last_login_at').nullable()
    t.timestamps(true, true)
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('users')
}
