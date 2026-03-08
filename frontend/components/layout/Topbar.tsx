'use client'

import { usePathname, useRouter } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/hotspots': 'Hotspot Analysis',
  '/dashboard/firs': 'FIR Records',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/behavioral': 'Behavioral Analysis',
  '/dashboard/patrols': 'Patrol Routes',
  '/dashboard/irad': 'IRAD Accidents',
  '/dashboard/reports': 'Reports',
}

export default function Topbar() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'Dashboard'
  const router = useRouter()

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('authToken')
      window.localStorage.removeItem('authUser')
    }
    router.push('/landing_page')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200/90 bg-white/75 px-5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
      <h1 className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>

      <button
        className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
        onClick={handleLogout}
      >
        Logout
      </button>
    </header>
  )
}
