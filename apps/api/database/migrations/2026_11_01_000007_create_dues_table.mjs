/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('dues', (t) => {
    t.bigIncrements('id')
    t.bigInteger('estate_id').unsigned().notNullable().references('estates.id').onDelete('CASCADE')
    t.string('title', 150).notNullable()
    t.text('description').nullable()
    t.bigInteger('amount').unsigned().notNullable() // minor units (e.g. kobo/cents)
    t.enum('frequency', ['one_time', 'monthly', 'quarterly', 'yearly']).notNullable().defaultTo('one_time')
    t.date('due_date').nullable()
    t.enum('status', ['active', 'archived']).notNullable().defaultTo('active')
    t.bigInteger('created_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
    t.timestamps(true, true)
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('dues')
}
