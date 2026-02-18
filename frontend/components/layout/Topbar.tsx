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
    <header className="h-14 border-b px-4 flex items-center justify-between">
      <h1 className="font-semibold">{title}</h1>

      <button
        className="text-sm text-red-600 hover:underline"
        onClick={handleLogout}
      >
        Logout
      </button>
    </header>
  )
}
