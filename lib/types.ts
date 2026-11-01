// Shapes returned by the API, shared by server pages and client components.

export type SessionUser = { id: number; name: string; email: string; phone: string | null; is_system_admin: boolean }

export type EstateSummary = {
  id: number; name: string; slug: string; address: string | null; currency: string; roles: string[]; is_admin: boolean
}

export type Me = { user: SessionUser; estates: EstateSummary[] }

export type EstateAccess = {
  estate: { id: number; name: string; slug: string; address: string | null; currency: string }
  access: { is_admin: boolean; roles: { id: number; name: string; slug: string }[]; permissions: string[]; residence_ids: number[] }
}

export type Dashboard = {
  estate: { id: number; name: string; currency: string }
  residence_count?: number
  member_count?: number
  finance?: {
    this_month: { income: number; expenses: number; net: number }
    balance: number
    recent_transactions: { id: number; type: string; category: string; amount: number; description: string | null; occurred_at: string }[]
  }
  receivables?: { outstanding_total: number; residences_owing: number; top_owing: { id: number; name: string; balance: number }[] }
  recent_announcements?: { id: number; title: string; published_at: string }[]
  active_dues?: { id: number; title: string; amount: number; frequency: string; due_date: string | null }[]
  my_residences?: { id: number; name: string; address_line1: string; unread_count: number; account: { balance: number } }[]
}

export type ResidenceRow = {
  id: number; name: string; address_line1: string; address_line2: string | null; city: string | null
  primary_contact_name: string | null; primary_contact_phone: string | null; balance: number | null
}

export type Contact = { id: number; name: string; phone: string | null; email: string | null; relationship: string; is_primary: boolean }

export type Residence = {
  id: number; name: string; address_line1: string; address_line2: string | null; city: string | null; state: string | null; postal_code: string | null
  contacts: Contact[]
  residents: { id: number; name: string; email: string; phone: string | null }[]
  unread_count: number
  account: { charged: number; paid: number; balance: number } | null
  access: { is_resident: boolean; can_manage: boolean; can_manage_account: boolean }
}

export type InboxMessage = { id: number; read_at: string | null; title: string; body: string; published_at: string; author_name: string | null }

export type ResidenceLedger = {
  summary: { charged: number; paid: number; balance: number }
  transactions: {
    id: number; type: string; amount: number; description: string | null; period: string | null; reference: string | null
    occurred_at: string; due_title: string | null; recorded_by_name: string | null
  }[]
}

export type Announcement = {
  id: number; title: string; body: string; audience: string; published_at: string; author_name: string | null; recipients: number; read_count: number
}

export type Due = {
  id: number; title: string; description: string | null; amount: number; frequency: string; due_date: string | null
  status: 'active' | 'archived'; charge_count: number; charged_total: number; current_period: string
}

export type EstateTx = {
  id: number; type: 'income' | 'expense'; category: string; amount: number; description: string | null; reference: string | null
  occurred_at: string; recorded_by_name: string | null; residence_id: number | null
}

export type EstateAccount = {
  summary: { income: number; expenses: number; net: number }
  balance: number
  by_category: { type: string; category: string; total: number }[]
  transactions: EstateTx[]
}

export type MemberRole = { id: number; name: string; slug: string; is_admin: boolean }

export type Member = {
  id: number; user_id: number; name: string; email: string; phone: string | null; roles: MemberRole[]; residences: { id: number; name: string }[]
}

export type Role = {
  id: number; name: string; slug: string; description: string | null; is_default: boolean; is_admin: boolean; member_count: number; permissions: string[]
}

export type PermissionDef = { key: string; group: string; label: string }

export type AdminUser = {
  id: number; name: string; email: string; phone: string | null; is_system_admin: boolean; is_active: boolean; last_login_at: string | null
}
