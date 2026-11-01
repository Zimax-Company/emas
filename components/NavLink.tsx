'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Sidebar link; `prefix` keeps it active on nested pages. */
export function NavLink({ href, prefix = false, children }: { href: string; prefix?: boolean; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = prefix ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href
  return (
    <Link href={href} className={active ? 'active' : undefined}>
      {children}
    </Link>
  )
}
