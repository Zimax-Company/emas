const PERMISSIONS = [
  ['visitors.view', 'Visitors', 'View visitor passes and the gate log for every residence'],
  ['visitors.manage', 'Visitors', 'Issue and cancel visitor codes for any residence'],
  ['visitors.validate', 'Visitors', 'Validate visitor in/out codes at the gate'],
]

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('visitor_passes', (t) => {
    t.bigIncrements('id')
    t.bigInteger('estate_id').unsigned().notNullable().references('estates.id').onDelete('CASCADE')
    t.bigInteger('residence_id').unsigned().notNullable().references('residences.id').onDelete('CASCADE')
    t.bigInteger('created_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
    t.string('visitor_name', 120).notNullable()
    t.string('visitor_phone', 40).nullable()
    t.string('purpose', 191).nullable()
    t.timestamp('valid_from').notNullable().defaultTo(knex.fn.now())
    t.timestamp('expires_at').notNullable() // the IN code stops working after this
    t.timestamp('checked_in_at').nullable()
    t.bigInteger('checked_in_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
    t.timestamp('checked_out_at').nullable()
    t.bigInteger('checked_out_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
    t.timestamp('cancelled_at').nullable()
    t.timestamps(true, true)
    t.index(['estate_id', 'valid_from'])
    t.index(['residence_id', 'created_at'])
  })

  // One IN and one OUT code per pass. `active_code` mirrors `code` while the code can still be used and
  // is cleared once it is used, cancelled or expired: the unique index keeps live codes unambiguous
  // within an estate while letting old codes be reissued.
  await knex.schema.createTable('visitor_codes', (t) => {
    t.bigIncrements('id')
    t.bigInteger('estate_id').unsigned().notNullable().references('estates.id').onDelete('CASCADE')
    t.bigInteger('pass_id').unsigned().notNullable().references('visitor_passes.id').onDelete('CASCADE')
    t.enum('direction', ['in', 'out']).notNullable()
    t.string('code', 12).notNullable()
    t.string('active_code', 12).nullable()
    t.timestamp('used_at').nullable()
    t.bigInteger('used_by').unsigned().nullable().references('users.id').onDelete('SET NULL')
    t.unique(['pass_id', 'direction'])
    t.unique(['estate_id', 'active_code'])
  })

  await knex('permissions').insert(PERMISSIONS.map(([key, group, label]) => ({ key, group, label })))
  // Estate admin roles hold every permission.
  for (const [key] of PERMISSIONS) {
    await knex.raw(
      'INSERT INTO role_permissions (role_id, permission_key) SELECT id, ? FROM roles WHERE is_admin = 1',
      [key],
    )
  }
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('visitor_codes')
  await knex.schema.dropTable('visitor_passes')
  await knex('permissions').whereIn('key', PERMISSIONS.map(([key]) => key)).delete()
}
