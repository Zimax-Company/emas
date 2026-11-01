/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('announcements', (t) => {
    t.bigIncrements('id')
    t.bigInteger('estate_id').unsigned().notNullable().references('estates.id').onDelete('CASCADE')
    t.bigInteger('author_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
    t.string('title', 191).notNullable()
    t.text('body').notNullable()
    t.enum('audience', ['all', 'selected']).notNullable().defaultTo('all')
    t.timestamp('published_at').notNullable().defaultTo(knex.fn.now())
    t.timestamps(true, true)
    t.index(['estate_id', 'published_at'])
  })

  // One row per residence that received the announcement: the residence inbox.
  await knex.schema.createTable('inbox_messages', (t) => {
    t.bigIncrements('id')
    t.bigInteger('announcement_id').unsigned().notNullable().references('announcements.id').onDelete('CASCADE')
    t.bigInteger('residence_id').unsigned().notNullable().references('residences.id').onDelete('CASCADE')
    t.timestamp('read_at').nullable()
    t.bigInteger('read_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
    t.unique(['announcement_id', 'residence_id'])
    t.index(['residence_id', 'read_at'])
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('inbox_messages')
  await knex.schema.dropTable('announcements')
}
