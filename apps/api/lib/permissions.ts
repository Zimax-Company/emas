// Mirrors the `permissions` table (seeded by migrations).
export const PERMISSIONS = [
  'estate.view',
  'estate.update',
  'members.view',
  'members.manage',
  'roles.view',
  'roles.manage',
  'residences.view',
  'residences.manage',
  'announcements.view',
  'announcements.publish',
  'dues.view',
  'dues.manage',
  'residence_accounts.view',
  'residence_accounts.manage',
  'estate_accounts.view',
  'estate_accounts.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const DEFAULT_ROLES = {
  admin: {
    slug: 'estate-admin',
    name: 'Estate Admin',
    description: 'Root access to the estate. Manages members, roles and permissions.',
    is_admin: true,
    permissions: [...PERMISSIONS] as Permission[],
  },
  resident: {
    slug: 'resident',
    name: 'Resident',
    description: 'Lives in the estate. Sees their residence inbox and account.',
    is_admin: false,
    permissions: ['estate.view', 'dues.view'] as Permission[],
  },
} as const
