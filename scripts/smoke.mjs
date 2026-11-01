#!/usr/bin/env node
// End-to-end smoke test of the API against a running app.
//   APP_URL=http://localhost:3000 ADMIN_EMAIL=admin@emas.local ADMIN_PASSWORD=password node scripts/smoke.mjs
const API = process.env.APP_URL || 'http://localhost:3000'
const run = Date.now().toString(36)
let failures = 0

async function call(method, path, token, body) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = res.status === 204 ? null : await res.json()
  return { status: res.status, data: json?.data, error: json?.error }
}

function check(label, cond, extra) {
  if (cond) console.log(`  \x1b[32m✓\x1b[0m ${label}`)
  else {
    failures++
    console.log(`  \x1b[31m✗\x1b[0m ${label}`, extra ?? '')
  }
}

const login = async (email, password) => (await call('POST', '/auth/login', null, { email, password })).data?.token

const sys = await login(process.env.ADMIN_EMAIL || 'admin@emas.local', process.env.ADMIN_PASSWORD || 'password')
check('system admin logs in', !!sys)

const unauth = await call('GET', '/estates')
check('unauthenticated request is rejected (401)', unauth.status === 401)

// Estate creation with first estate admin
const adminEmail = `admin-${run}@example.com`
const est = await call('POST', '/estates', sys, {
  name: `Palm Gardens ${run}`,
  address: '1 Palm Avenue',
  admin: { name: 'Ada Admin', email: adminEmail, password: 'secret123' },
})
check('system admin creates estate with an admin', est.status === 201, est.error)
const eid = est.data.estate.id

const roles = await call('GET', `/estates/${eid}/roles`, sys)
check('estate ships with estate-admin and resident roles', ['estate-admin', 'resident'].every((s) => roles.data.some((r) => r.slug === s)))
const residentRole = roles.data.find((r) => r.slug === 'resident')

const ea = await login(adminEmail, 'secret123')
check('estate admin logs in', !!ea)
const eaCreate = await call('POST', '/estates', ea, { name: 'Nope' })
check('estate admin cannot create estates (403)', eaCreate.status === 403)

// Residences + contacts
const res1 = await call('POST', `/estates/${eid}/residences`, ea, {
  name: 'House 1', address_line1: '1 Palm Close', city: 'Lagos',
  contacts: [{ name: 'Bola Owner', phone: '0800000001', relationship: 'owner' }],
})
check('estate admin creates residence with contact', res1.status === 201, res1.error)
const res2 = await call('POST', `/estates/${eid}/residences`, ea, { name: 'House 2', address_line1: '2 Palm Close' })
const rid = res1.data.id
const contact = await call('POST', `/estates/${eid}/residences/${rid}/contacts`, ea, { name: 'Emergency Kemi', phone: '0800000002', relationship: 'emergency' })
check('adds a second contact', contact.status === 201 && contact.data.is_primary === 0, contact)

// Resident
const residentEmail = `resident-${run}@example.com`
const resident = await call('POST', `/estates/${eid}/residences/${rid}/residents`, ea, { name: 'Rita Resident', email: residentEmail })
check('adds resident (new user gets temporary password)', resident.status === 201 && !!resident.data.temporary_password, resident.error)
const rt = await login(residentEmail, resident.data.temporary_password)
check('resident logs in with temporary password', !!rt)

// Announcements -> inbox
const ann = await call('POST', `/estates/${eid}/announcements`, ea, { title: 'Water outage', body: 'Tuesday 9am-2pm' })
check('admin publishes announcement to all residences', ann.status === 201 && ann.data.recipients === 2, ann)
const inbox = await call('GET', `/estates/${eid}/residences/${rid}/inbox`, rt)
check('resident sees announcement in residence inbox', inbox.data?.length === 1 && inbox.data[0].read_at === null)
const read = await call('PATCH', `/estates/${eid}/residences/${rid}/inbox/${inbox.data[0].id}`, rt)
check('resident marks message read', read.status === 204)
const otherInbox = await call('GET', `/estates/${eid}/residences/${res2.data.id}/inbox`, rt)
check("resident cannot read another residence's inbox (403)", otherInbox.status === 403)

// Dues -> residence accounts
const due = await call('POST', `/estates/${eid}/dues`, ea, { title: 'Service charge', amount: 2500000, frequency: 'monthly' })
check('admin creates monthly due', due.status === 201, due.error)
const charge = await call('POST', `/estates/${eid}/dues/${due.data.id}/charge`, ea, {})
check('charges all residences for current period', charge.data?.charged === 2, charge)
const recharge = await call('POST', `/estates/${eid}/dues/${due.data.id}/charge`, ea, {})
check('re-charging same period is skipped', recharge.data?.charged === 0 && recharge.data?.skipped === 2, recharge)

const pay = await call('POST', `/estates/${eid}/residences/${rid}/transactions`, ea, { type: 'payment', amount: 1000000, reference: 'TRX-1' })
check('admin records payment', pay.status === 201, pay.error)
const acct = await call('GET', `/estates/${eid}/residences/${rid}/transactions`, rt)
check('resident sees own account balance (15,000.00 owed)', acct.data?.summary.balance === 1500000, acct.data?.summary)
const residentPay = await call('POST', `/estates/${eid}/residences/${rid}/transactions`, rt, { type: 'credit', amount: 1 })
check('resident cannot post to account (403)', residentPay.status === 403)

// Estate account
const exp = await call('POST', `/estates/${eid}/account`, ea, { type: 'expense', category: 'Security', amount: 400000 })
check('admin records expense', exp.status === 201, exp.error)
const ledger = await call('GET', `/estates/${eid}/account`, ea)
check('estate account: income 10,000 / expense 4,000 / net 6,000',
  ledger.data?.summary.income === 1000000 && ledger.data?.summary.expenses === 400000 && ledger.data?.balance === 600000, ledger.data?.summary)
const residentLedger = await call('GET', `/estates/${eid}/account`, rt)
check('resident cannot view estate account (403)', residentLedger.status === 403)

// Roles & permissions
const treasurer = await call('POST', `/estates/${eid}/roles`, ea, { name: 'Treasurer', permissions: ['estate.view', 'estate_accounts.view', 'estate_accounts.manage'] })
check('admin creates custom role', treasurer.status === 201, treasurer.error)
const members = await call('GET', `/estates/${eid}/members`, ea)
const rita = members.data.find((m) => m.email === residentEmail)
const assign = await call('PATCH', `/estates/${eid}/members/${rita.id}`, ea, { role_ids: [residentRole.id, treasurer.data.id] })
check('admin assigns Treasurer role to resident', assign.status === 200 && assign.data.roles.length === 2, assign.error)
const nowLedger = await call('GET', `/estates/${eid}/account`, rt)
check('resident-treasurer can now view estate account', nowLedger.status === 200)
const escalate = await call('PATCH', `/estates/${eid}/roles/${treasurer.data.id}`, rt, { permissions: ['members.manage'] })
check('treasurer cannot edit roles (403)', escalate.status === 403)
const adminRole = roles.data.find((r) => r.is_admin)
const lock = await call('PATCH', `/estates/${eid}/roles/${adminRole.id}`, ea, { permissions: [] })
check('estate admin role is locked (400)', lock.status === 400)
const delDefault = await call('DELETE', `/estates/${eid}/roles/${residentRole.id}`, ea)
check('default roles cannot be deleted (400)', delDefault.status === 400)
const adminMember = members.data.find((m) => m.email === adminEmail)
const lastAdmin = await call('DELETE', `/estates/${eid}/members/${adminMember.id}`, ea)
check('cannot remove the last estate admin (400)', lastAdmin.status === 400)

// Visitor codes
const pass = await call('POST', `/estates/${eid}/residences/${rid}/visitors`, rt, { visitor_name: 'Victor Visitor', purpose: 'Family visit', valid_hours: 4 })
check('resident generates visitor IN/OUT codes', pass.status === 201 && /^\d{6}$/.test(pass.data?.entry_code) && /^\d{6}$/.test(pass.data?.exit_code), pass.error)
const otherPass = await call('POST', `/estates/${eid}/residences/${res2.data.id}/visitors`, rt, { visitor_name: 'Nope' })
check('resident cannot issue codes for another residence (403)', otherPass.status === 403)
const residentGate = await call('POST', `/estates/${eid}/visitors/validate`, rt, { code: pass.data.entry_code })
check('resident cannot validate codes (403)', residentGate.status === 403)
const guardRole = await call('POST', `/estates/${eid}/roles`, ea, { name: 'Security', permissions: ['estate.view', 'visitors.validate'] })
const guardEmail = `guard-${run}@example.com`
await call('POST', `/estates/${eid}/members`, ea, { name: 'Gary Guard', email: guardEmail, password: 'guard123', role_ids: [guardRole.data.id] })
const gt = await login(guardEmail, 'guard123')
check('security member with visitors.validate logs in', !!gt)
const earlyOut = await call('POST', `/estates/${eid}/visitors/validate`, gt, { code: pass.data.exit_code })
check('OUT code is refused before check-in (409)', earlyOut.status === 409, earlyOut)
const checkIn = await call('POST', `/estates/${eid}/visitors/validate`, gt, { code: pass.data.entry_code })
check('guard validates IN code', checkIn.status === 200 && checkIn.data?.direction === 'in' && checkIn.data?.pass.status === 'inside', checkIn)
check('gate response does not reveal codes', checkIn.data?.pass.entry_code === null && checkIn.data?.pass.exit_code === null)
const reuse = await call('POST', `/estates/${eid}/visitors/validate`, gt, { code: pass.data.entry_code })
check('IN code cannot be reused (404)', reuse.status === 404, reuse)
const inside = await call('GET', `/estates/${eid}/visitors?status=inside`, gt)
check('gate log lists the visitor as inside', inside.data?.some((p) => p.id === pass.data.id))
const checkOut = await call('POST', `/estates/${eid}/visitors/validate`, gt, { code: pass.data.exit_code })
check('guard validates OUT code', checkOut.status === 200 && checkOut.data?.direction === 'out' && checkOut.data?.pass.status === 'completed', checkOut)
const reuseOut = await call('POST', `/estates/${eid}/visitors/validate`, gt, { code: pass.data.exit_code })
check('OUT code cannot be reused (404)', reuseOut.status === 404)
const cancelled = await call('POST', `/estates/${eid}/residences/${rid}/visitors`, rt, { visitor_name: 'Cancelled Carl' })
await call('DELETE', `/estates/${eid}/residences/${rid}/visitors/${cancelled.data.id}`, rt)
const useCancelled = await call('POST', `/estates/${eid}/visitors/validate`, gt, { code: cancelled.data.entry_code })
check('cancelled pass code is refused (404)', useCancelled.status === 404)
const later = await call('POST', `/estates/${eid}/residences/${rid}/visitors`, rt, { visitor_name: 'Tomorrow Tola', valid_from: new Date(Date.now() + 86_400_000).toISOString() })
const early = await call('POST', `/estates/${eid}/visitors/validate`, gt, { code: later.data.entry_code })
check('IN code is refused before the pass starts (409)', early.status === 409)
const foreignCode = await call('POST', `/estates/${eid}/visitors/validate`, sys, { code: pass.data.entry_code })
check('used code stays invalid for everyone', foreignCode.status === 404)

// Dashboards & multi-tenancy
const dashAdmin = await call('GET', `/estates/${eid}/dashboard`, ea)
check('admin dashboard has finance + receivables', !!dashAdmin.data?.finance && dashAdmin.data?.receivables.outstanding_total === 4000000, dashAdmin.data?.receivables)
const dashRes = await call('GET', `/estates/${eid}/dashboard`, rt)
check('resident dashboard shows own residence', dashRes.data?.my_residences?.length === 1)

const est2 = await call('POST', '/estates', sys, { name: `Oak Ridge ${run}` })
const est2Roles = await call('GET', `/estates/${est2.data.estate.id}/roles`, sys)
await call('POST', `/estates/${est2.data.estate.id}/members`, sys, {
  name: 'Ada Admin', email: adminEmail, role_ids: [est2Roles.data.find((r) => r.is_admin).id],
})
const me = await call('GET', '/auth/me', ea)
check('estate admin can access multiple estate dashboards', me.data?.estates.length === 2, me.data?.estates)
const foreign = await call('GET', `/estates/${est2.data.estate.id}/dashboard`, rt)
check('resident cannot see another estate (404)', foreign.status === 404)

console.log(failures ? `\n\x1b[31m${failures} check(s) failed\x1b[0m` : '\n\x1b[32mAll checks passed\x1b[0m')
process.exit(failures ? 1 : 0)
