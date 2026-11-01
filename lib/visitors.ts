import { randomInt } from 'node:crypto'
import type { Knex } from 'knex'
import { z } from 'zod'
import { db } from './db'
import { ApiError, conflict } from './http'

export const CODE_LENGTH = 6

export const visitorPassSchema = z.object({
  visitor_name: z.string().trim().min(1).max(120),
  visitor_phone: z.string().trim().max(40).nullable().optional(),
  purpose: z.string().trim().max(191).nullable().optional(),
  valid_from: z.coerce.date().optional(),
  valid_hours: z.number().int().min(1).max(168).default(24), // up to a week
})

export const validateSchema = z.object({
  code: z.string().trim().regex(new RegExp(`^\\d{${CODE_LENGTH}}$`), `Codes are ${CODE_LENGTH} digits`),
})

export type PassStatus = 'cancelled' | 'completed' | 'inside' | 'expired' | 'upcoming' | 'active'

type PassRow = {
  valid_from: Date; expires_at: Date; checked_in_at: Date | null; checked_out_at: Date | null; cancelled_at: Date | null
}

export function passStatus(p: PassRow, now = new Date()): PassStatus {
  if (p.cancelled_at) return 'cancelled'
  if (p.checked_out_at) return 'completed'
  if (p.checked_in_at) return 'inside'
  if (new Date(p.expires_at) < now) return 'expired'
  if (new Date(p.valid_from) > now) return 'upcoming'
  return 'active'
}

/** Passes with residence and gate-staff names. Codes are added separately, only for callers allowed to see them. */
export function passQuery(estateId: number) {
  return db('visitor_passes as p')
    .join('residences as r', 'r.id', 'p.residence_id')
    .leftJoin('users as c', 'c.id', 'p.created_by')
    .leftJoin('users as gi', 'gi.id', 'p.checked_in_by')
    .leftJoin('users as go', 'go.id', 'p.checked_out_by')
    .where('p.estate_id', estateId)
    .select(
      'p.id', 'p.residence_id', 'r.name as residence_name', 'p.visitor_name', 'p.visitor_phone', 'p.purpose',
      'p.valid_from', 'p.expires_at', 'p.checked_in_at', 'p.checked_out_at', 'p.cancelled_at', 'p.created_at',
      'c.name as created_by_name', 'gi.name as checked_in_by_name', 'go.name as checked_out_by_name',
    )
}

export async function withCodes<T extends PassRow & { id: number }>(passes: T[], showCodes: boolean) {
  const codes = showCodes && passes.length
    ? await db('visitor_codes').whereIn('pass_id', passes.map((p) => p.id)).select('pass_id', 'direction', 'code')
    : []
  return passes.map((p) => ({
    ...p,
    status: passStatus(p),
    entry_code: codes.find((c) => c.pass_id === p.id && c.direction === 'in')?.code ?? null,
    exit_code: codes.find((c) => c.pass_id === p.id && c.direction === 'out')?.code ?? null,
  }))
}

/**
 * Frees the live codes of passes that expired before anyone checked in, so those
 * numbers can be issued again. OUT codes of visitors still inside stay live.
 */
export async function releaseExpiredCodes(estateId: number, trx: Knex | Knex.Transaction = db) {
  await trx('visitor_codes')
    .where('estate_id', estateId)
    .whereNotNull('active_code')
    .whereIn('pass_id', trx('visitor_passes').where('estate_id', estateId).whereNull('checked_in_at').where('expires_at', '<', new Date()).select('id'))
    .update({ active_code: null })
}

/** Inserts a code that is unique among the estate's live codes, retrying on collision. */
export async function insertCode(trx: Knex.Transaction, estateId: number, passId: number, direction: 'in' | 'out') {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
    try {
      await trx('visitor_codes').insert({ estate_id: estateId, pass_id: passId, direction, code, active_code: code })
      return code
    } catch (err) {
      if ((err as { code?: string }).code !== 'ER_DUP_ENTRY') throw err
    }
  }
  throw new ApiError(503, 'Could not generate a unique code, try again')
}

const invalidCode = () => new ApiError(404, 'Invalid code. It may be wrong, expired, cancelled or already used.')

/**
 * Uses a visitor code at the gate. Each code works once: the IN code checks the visitor in
 * during the pass window, the OUT code checks them out after they have entered.
 */
export async function useCode(estateId: number, code: string, userId: number) {
  return db.transaction(async (trx) => {
    const row = await trx('visitor_codes as vc')
      .join('visitor_passes as p', 'p.id', 'vc.pass_id')
      .where({ 'vc.estate_id': estateId, 'vc.active_code': code })
      .forUpdate()
      .first('vc.id', 'vc.direction', 'p.id as pass_id', 'p.valid_from', 'p.expires_at', 'p.checked_in_at', 'p.checked_out_at', 'p.cancelled_at')
    if (!row || row.cancelled_at) throw invalidCode()

    const now = new Date()
    if (row.direction === 'in') {
      if (new Date(row.expires_at) < now) throw invalidCode()
      if (new Date(row.valid_from) > now) throw conflict('This pass is not valid yet')
    } else if (!row.checked_in_at) {
      throw conflict('The visitor has not checked in with their IN code yet')
    }

    // The row lock plus the active_code condition make concurrent uses of one code fail.
    const used = await trx('visitor_codes')
      .where({ id: row.id, active_code: code })
      .update({ active_code: null, used_at: now, used_by: userId })
    if (!used) throw invalidCode()

    await trx('visitor_passes')
      .where({ id: row.pass_id })
      .update(row.direction === 'in' ? { checked_in_at: now, checked_in_by: userId, updated_at: now } : { checked_out_at: now, checked_out_by: userId, updated_at: now })

    return { direction: row.direction as 'in' | 'out', passId: Number(row.pass_id) }
  })
}
