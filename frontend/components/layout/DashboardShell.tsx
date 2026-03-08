import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-theme relative flex h-[calc(100vh-56px)] overflow-hidden text-zinc-900 dark:text-zinc-100">
      <div className="dashboard-twinkle pointer-events-none absolute inset-0" />
      <Sidebar />
      <div className="relative z-10 flex flex-col flex-1">
        <Topbar />
        <main className="flex-1 overflow-auto p-5 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
