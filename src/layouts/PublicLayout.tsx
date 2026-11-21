import { Link, Outlet } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <header className="border-b border-border dark:border-[#30363D] bg-white dark:bg-[#161B22]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo size="md" to="/" />

          <nav className="flex items-center gap-3 sm:gap-5">
            <ThemeToggle size="sm" />
            <Link to="/login" className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              to="/register/patient"
              className="text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors shadow-xs"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border dark:border-[#30363D] bg-white dark:bg-[#161B22]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="xs" to="/" />
          <p className="text-xs text-slate-400 dark:text-slate-400 text-center sm:text-left">
            © {new Date().getFullYear()} MediConnect. Smart Medicine Reordering System.
          </p>
          <nav className="flex items-center gap-5">
            <Link to="/privacy" className="text-xs text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-xs text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              Terms
            </Link>
            <a href="mailto:satya2006prakash@gmail.com" className="text-xs text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              Support
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
