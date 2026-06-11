'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/skills', label: 'Skills' },
  { href: '/pipeline', label: 'Pipeline' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="text-lg font-bold tracking-tight text-foreground">Jobreel</span>
        </div>
        <div className="flex gap-6">
          {LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 pb-1 text-sm font-medium transition-colors ${
                  active
                    ? 'border-accent text-foreground'
                    : 'border-transparent text-muted hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
