import { z } from 'zod'

export const residenceSchema = z.object({
  name: z.string().trim().min(1).max(150),
  address_line1: z.string().trim().min(1).max(191),
  address_line2: z.string().trim().max(191).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  postal_code: z.string().trim().max(20).nullable().optional(),
})

export const residenceUpdateSchema = residenceSchema.partial()

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.email().nullable().optional(),
  relationship: z.string().trim().min(1).max(40).default('owner'),
  is_primary: z.boolean().default(false),
})

export const contactUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.email().nullable().optional(),
  relationship: z.string().trim().min(1).max(40).optional(),
  is_primary: z.boolean().optional(),
})
