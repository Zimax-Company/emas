/** @param {import('knex').Knex} knex */
export async function up(knex) {
  // Estate account: income and expenses. Amounts are positive minor units.
  await knex.schema.createTable('estate_transactions', (t) => {
    t.bigIncrements('id')
    t.bigInteger('estate_id').unsigned().notNullable().references('estates.id').onDelete('CASCADE')
    t.enum('type', ['income', 'expense']).notNullable()
    t.string('category', 80).notNullable()
    t.bigInteger('amount').unsigned().notNullable()
    t.string('description', 255).nullable()
    t.string('reference', 100).nullable()
    t.bigInteger('recorded_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now())
    t.timestamps(true, true)
    t.index(['estate_id', 'occurred_at'])
  })

  // Residence account ledger. Balance owed = charges - (payments + credits).
  await knex.schema.createTable('residence_transactions', (t) => {
    t.bigIncrements('id')
    t.bigInteger('estate_id').unsigned().notNullable().references('estates.id').onDelete('CASCADE')
    t.bigInteger('residence_id').unsigned().notNullable().references('residences.id').onDelete('CASCADE')
    t.enum('type', ['charge', 'payment', 'credit']).notNullable()
    t.bigInteger('amount').unsigned().notNullable()
    t.string('description', 255).nullable()
    t.bigInteger('due_id').unsigned().nullable().references('dues.id').onDelete('SET NULL')
    t.string('period', 20).nullable() // e.g. 2026-11, 2026-Q4, 2026, once
    t.string('reference', 100).nullable()
    t.bigInteger('estate_transaction_id').unsigned().nullable().references('estate_transactions.id').onDelete('SET NULL')
    t.bigInteger('recorded_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now())
    t.timestamps(true, true)
    t.index(['residence_id', 'occurred_at'])
    t.unique(['due_id', 'residence_id', 'period']) // a due is charged once per residence per period
  })
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('residence_transactions')
  await knex.schema.dropTable('estate_transactions')
}
