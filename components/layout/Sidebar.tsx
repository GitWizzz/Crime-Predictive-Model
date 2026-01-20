import Link from 'next/link'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Hotspots', href: '/dashboard/hotspots' },
  { label: 'FIR Records', href: '/dashboard/firs' },
  { label: 'Reports', href: '/dashboard/reports' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-100 p-4">
      <h2 className="font-semibold mb-4">Crime Analytics</h2>

      <nav className="space-y-2">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-3 py-2 rounded hover:bg-gray-200"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
