/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('estate_members', (t) => {
    t.bigIncrements('id')
    t.bigInteger('estate_id').unsigned().notNullable().references('estates.id').onDelete('CASCADE')
    t.bigInteger('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
    t.timestamps(true, true)
    t.unique(['estate_id', 'user_id'])
  })

  await knex.schema.createTable('estate_member_roles', (t) => {
    t.bigInteger('estate_member_id').unsigned().notNullable().references('estate_members.id').onDelete('CASCADE')
    t.bigInteger('role_id').unsigned().notNullable().references('roles.id').onDelete('CASCADE')
    t.primary(['estate_member_id', 'role_id'])
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('estate_member_roles')
  await knex.schema.dropTable('estate_members')
}
