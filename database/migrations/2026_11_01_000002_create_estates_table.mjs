/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('estates', (t) => {
    t.bigIncrements('id')
    t.string('name', 150).notNullable()
    t.string('slug', 160).notNullable().unique()
    t.text('address').nullable()
    t.string('currency', 3).notNullable().defaultTo('NGN')
    t.bigInteger('created_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
    t.timestamps(true, true)
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('estates')
}
