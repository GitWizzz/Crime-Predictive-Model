'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/hotspots': 'Hotspot Analysis',
  '/dashboard/firs': 'FIR Records',
  '/dashboard/reports': 'Reports',
}

export default function Topbar() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'Dashboard'

  return (
    <header className="h-14 border-b px-4 flex items-center justify-between">
      <h1 className="font-semibold">{title}</h1>

      <button
        className="text-sm text-red-600 hover:underline"
        onClick={() => alert('Logout will be implemented later')}
      >
        Logout
      </button>
    </header>
  )
}
