import knex, { type Knex } from 'knex'
import { knexConfig } from '@/database/config.mjs'

const globalForDb = globalThis as unknown as { __emasDb?: Knex }

export const db: Knex = globalForDb.__emasDb ?? knex(knexConfig())

if (process.env.NODE_ENV !== 'production') globalForDb.__emasDb = db

export const now = () => new Date()
