// Snapshot of the permission catalog at the time of this migration.
// Add new permissions in a new migration, then reference them in lib/permissions.ts.
const PERMISSIONS = [
  ['estate.view', 'Estate', 'View estate dashboard'],
  ['estate.update', 'Estate', 'Update estate settings'],
  ['members.view', 'Members', 'View members'],
  ['members.manage', 'Members', 'Add, remove and assign roles to members'],
  ['roles.view', 'Roles', 'View roles'],
  ['roles.manage', 'Roles', 'Create, edit and delete roles'],
  ['residences.view', 'Residences', 'View all residences'],
  ['residences.manage', 'Residences', 'Create and edit residences, contacts and residents'],
  ['announcements.view', 'Announcements', 'View all announcements'],
  ['announcements.publish', 'Announcements', 'Publish announcements to residence inboxes'],
  ['dues.view', 'Dues', 'View dues'],
  ['dues.manage', 'Dues', 'Create dues and charge residences'],
  ['residence_accounts.view', 'Residence accounts', 'View every residence account'],
  ['residence_accounts.manage', 'Residence accounts', 'Record payments and adjustments on residence accounts'],
  ['estate_accounts.view', 'Estate account', 'View estate income and expenses'],
  ['estate_accounts.manage', 'Estate account', 'Record estate income and expenses'],
]

/** @param {import('knex').Knex} knex */
export async function up(knex) {
  await knex.schema.createTable('permissions', (t) => {
    t.string('key', 64).primary()
    t.string('group', 64).notNullable()
    t.string('label', 191).notNullable()
  })

  await knex.schema.createTable('roles', (t) => {
    t.bigIncrements('id')
    t.bigInteger('estate_id').unsigned().notNullable().references('estates.id').onDelete('CASCADE')
    t.string('name', 80).notNullable()
    t.string('slug', 80).notNullable()
    t.string('description', 255).nullable()
    t.boolean('is_default').notNullable().defaultTo(false) // ships with every estate, cannot be deleted
    t.boolean('is_admin').notNullable().defaultTo(false) // root access within the estate
    t.timestamps(true, true)
    t.unique(['estate_id', 'slug'])
  })

  await knex.schema.createTable('role_permissions', (t) => {
    t.bigInteger('role_id').unsigned().notNullable().references('roles.id').onDelete('CASCADE')
    t.string('permission_key', 64).notNullable().references('permissions.key').onDelete('CASCADE')
    t.primary(['role_id', 'permission_key'])
  })

  await knex('permissions').insert(PERMISSIONS.map(([key, group, label]) => ({ key, group, label })))
}

/** @param {import('knex').Knex} knex */
export async function down(knex) {
  await knex.schema.dropTable('role_permissions')
  await knex.schema.dropTable('roles')
  await knex.schema.dropTable('permissions')
}
