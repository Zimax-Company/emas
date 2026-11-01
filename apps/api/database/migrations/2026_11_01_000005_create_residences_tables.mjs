/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('residences', (t) => {
    t.bigIncrements('id')
    t.bigInteger('estate_id').unsigned().notNullable().references('estates.id').onDelete('CASCADE')
    t.string('name', 150).notNullable()
    t.string('address_line1', 191).notNullable()
    t.string('address_line2', 191).nullable()
    t.string('city', 100).nullable()
    t.string('state', 100).nullable()
    t.string('postal_code', 20).nullable()
    t.timestamps(true, true)
    t.index(['estate_id', 'name'])
  })

  await knex.schema.createTable('residence_contacts', (t) => {
    t.bigIncrements('id')
    t.bigInteger('residence_id').unsigned().notNullable().references('residences.id').onDelete('CASCADE')
    t.string('name', 120).notNullable()
    t.string('phone', 40).nullable()
    t.string('email', 191).nullable()
    t.string('relationship', 40).notNullable().defaultTo('owner') // owner, tenant, family, emergency, staff...
    t.boolean('is_primary').notNullable().defaultTo(false)
    t.timestamps(true, true)
  })

  // Links user accounts to the residences they live in (grants inbox/account access).
  await knex.schema.createTable('residence_residents', (t) => {
    t.bigInteger('residence_id').unsigned().notNullable().references('residences.id').onDelete('CASCADE')
    t.bigInteger('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    t.primary(['residence_id', 'user_id'])
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('residence_residents')
  await knex.schema.dropTable('residence_contacts')
  await knex.schema.dropTable('residences')
}
