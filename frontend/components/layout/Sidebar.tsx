"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Hotspots', href: '/dashboard/hotspots' },
  { label: 'FIR Records', href: '/dashboard/firs' },
  { label: 'Analytics', href: '/dashboard/analytics' },
  { label: 'Behavioral', href: '/dashboard/behavioral' },
  { label: 'Patrol Routes', href: '/dashboard/patrols' },
  { label: 'IRAD Accidents', href: '/dashboard/irad' },
  { label: 'Reports', href: '/dashboard/reports' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-zinc-200/90 bg-white/85 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
      <h2 className="mb-4 px-2 text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">Crime Analytics</h2>

      <nav className="space-y-2">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 hover:shadow-sm dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
