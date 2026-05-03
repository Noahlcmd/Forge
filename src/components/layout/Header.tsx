import type { AppUserProfile } from '@/lib/auth/getAppUser'
import { NotificationBell } from './NotificationBell'

interface HeaderProps {
  title:   string
  profile: AppUserProfile
}

export function Header({ title, profile }: HeaderProps) {
  const initials = (profile.full_name ?? profile.email)
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header
      className="h-14 px-6 flex items-center justify-between shrink-0"
      style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--card-bg)' }}
    >
      <h1 className="text-[14px] font-[600]" style={{ color: 'var(--text-primary)' }}>{title}</h1>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.25)' }}
        >
          <span className="text-[11px] font-[700]" style={{ color: 'var(--color-primary, #f97316)' }}>{initials}</span>
        </div>
      </div>
    </header>
  )
}
