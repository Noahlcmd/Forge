import { Flame, Users, Mail, BarChart3, Zap } from 'lucide-react'

const FEATURES = [
  {
    icon: Users,
    title: 'CRM & Lead Management',
    sub: 'Track every customer and lead through your full pipeline.',
  },
  {
    icon: Mail,
    title: 'Automated Outreach',
    sub: 'Email sequences with follow-ups that stop when they reply.',
  },
  {
    icon: BarChart3,
    title: 'Finance & Invoicing',
    sub: 'Invoices, transactions, and revenue tracking in one view.',
  },
  {
    icon: Zap,
    title: 'All your tools, connected',
    sub: 'Gmail, Stripe, Google Calendar, Apollo, Hunter — native integrations.',
  },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] flex">

      {/* ── Left: brand panel (lg+) ─────────────────────────────── */}
      <div className="hidden lg:flex w-[460px] xl:w-[520px] shrink-0 flex-col relative overflow-hidden border-r border-zinc-800/60">

        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-40 -left-40 w-[480px] h-[480px] rounded-full bg-orange-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 rounded-full bg-orange-600/5 blur-3xl" />

        {/* Dot grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(250,250,250,0.06) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative flex flex-col flex-1 p-10">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Forge</span>
          </div>

          {/* Hero copy */}
          <div className="mt-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-xs font-medium text-orange-400">Business operations platform</span>
            </div>
            <h2 className="text-[2rem] font-bold text-white leading-[1.2] tracking-tight">
              Everything your<br />business needs,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">in one place.</span>
            </h2>
            <p className="mt-5 text-sm text-zinc-400 leading-relaxed max-w-xs">
              Manage customers, leads, outreach, finances, and ad campaigns from a single unified workspace.
            </p>
          </div>

          {/* Feature list */}
          <div className="mt-10 flex flex-col gap-3.5">
            {FEATURES.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-start gap-3.5 group">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0 group-hover:border-orange-500/30 group-hover:bg-orange-500/5 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-auto pt-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-sm text-zinc-300 leading-relaxed">
                &ldquo;Forge replaced four different tools we were using. Everything we need in one place, and the team onboarded in a day.&rdquo;
              </p>
              <div className="flex items-center gap-2.5 mt-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">S</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Sarah K.</p>
                  <p className="text-xs text-zinc-500">Founder, Meridian Studio</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: form area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Mobile logo bar */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-8 pb-4">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow shadow-orange-500/30">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-white">Forge</span>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-[400px] animate-slide-up">
            {children}
          </div>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-5 pb-8 px-6">
          <span className="text-xs text-zinc-600">© 2025 Forge</span>
          <span className="text-zinc-800">·</span>
          <a href="#" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Privacy</a>
          <span className="text-zinc-800">·</span>
          <a href="#" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Terms</a>
        </div>
      </div>

    </div>
  )
}
