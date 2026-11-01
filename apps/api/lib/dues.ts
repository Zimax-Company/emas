import { z } from 'zod'

export const FREQUENCIES = ['one_time', 'monthly', 'quarterly', 'yearly'] as const
export type Frequency = (typeof FREQUENCIES)[number]

export const dueSchema = z.object({
  title: z.string().trim().min(1).max(150),
  description: z.string().trim().max(5000).nullable().optional(),
  amount: z.number().int().positive(), // minor units
  frequency: z.enum(FREQUENCIES).default('one_time'),
  due_date: z.iso.date().nullable().optional(),
})

export const dueUpdateSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  amount: z.number().int().positive().optional(),
  due_date: z.iso.date().nullable().optional(),
  status: z.enum(['active', 'archived']).optional(),
})

/** Billing period label, used to stop a due being charged twice for the same period. */
export function currentPeriod(frequency: Frequency, d = new Date()) {
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth()
  switch (frequency) {
    case 'monthly':
      return `${y}-${String(m + 1).padStart(2, '0')}`
    case 'quarterly':
      return `${y}-Q${Math.floor(m / 3) + 1}`
    case 'yearly':
      return String(y)
    default:
      return 'once'
  }
}
