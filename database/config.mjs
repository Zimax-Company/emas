// Shared by the Next.js runtime (lib/db.ts) and the artisan CLI (scripts/artisan.mjs).
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

export function connectionFromEnv(env = process.env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
  // A raw '#', '?' or '/' in the password ends the host part early, so the user name gets parsed as the host.
  const credentials = env.DATABASE_URL.match(/^[a-z0-9+]+:\/\/(.*)@/i)?.[1] ?? ''
  if (/[#?/]/.test(credentials)) {
    throw new Error("DATABASE_URL credentials contain '#', '?' or '/'. URL-encode the password (encodeURIComponent).")
  }
  const url = new URL(env.DATABASE_URL)
  const ssl = url.searchParams.get('ssl')
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: ssl === 'true' ? { rejectUnauthorized: true } : undefined,
    timezone: 'Z',
    supportBigNumbers: true,
    decimalNumbers: true,
    charset: 'utf8mb4',
  }
}

export function knexConfig(env = process.env) {
  return {
    client: 'mysql2',
    connection: connectionFromEnv(env),
    // Small pool: serverless functions each hold their own.
    pool: { min: 0, max: Number(env.DB_POOL_MAX || 5) },
    migrations: {
      directory: path.join(here, 'migrations'),
      tableName: 'migrations',
      loadExtensions: ['.mjs'],
    },
    seeds: {
      directory: path.join(here, 'seeds'),
      loadExtensions: ['.mjs'],
    },
  }
}
