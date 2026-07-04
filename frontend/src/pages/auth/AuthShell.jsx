export function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen">
      {/* Branding panel — clean & professional, no marketing copy */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-700/20 blur-3xl" />
        <div className="relative flex flex-col items-center gap-4">
          <img src="/logo.svg" alt="logo" className="h-16 w-16" />
          <span className="text-xl font-semibold tracking-tight">Employee Report System</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center bg-slate-50 p-6 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
