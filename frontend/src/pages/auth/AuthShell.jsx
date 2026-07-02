import { CheckCircle2 } from 'lucide-react'

export function AuthShell({ children }) {
  const year = new Date().getFullYear()
  return (
    <div className="flex min-h-screen">
      {/* Branding panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-700/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <img src="/logo.svg" alt="logo" className="h-10 w-10" />
          <span className="text-lg font-semibold">Employee Report System</span>
        </div>

        <div className="relative">
          <h1 className="text-4xl font-bold leading-tight">
            Run your team&apos;s daily reporting like a Fortune 500.
          </h1>
          <p className="mt-4 max-w-md text-slate-300">
            Timeline-based task logging, manager approvals, leave management and escalations —
            all in one clean, modern workspace.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            {[
              'Drag-to-log daily tasks on a visual timeline',
              'One-click approvals & clarification requests',
              'Leave requests, escalations & email alerts',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-brand-400" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">© {year} Employee Report System</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-slate-50 p-6 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
