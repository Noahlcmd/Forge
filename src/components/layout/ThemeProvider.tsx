'use client'

import { useEffect } from 'react'
import type { OrgTheme } from '@/lib/theme'

interface Props {
  theme: OrgTheme
  children: React.ReactNode
}

export function ThemeProvider({ theme, children }: Props) {
  useEffect(() => {
    const root = document.documentElement

    root.style.setProperty('--color-primary',       theme.primaryColor)
    root.style.setProperty('--color-accent',        theme.accentColor)
    root.style.setProperty('--color-primary-alpha', theme.primaryColor + '22')
    root.setAttribute('data-sidebar-style', theme.sidebarStyle)
    root.setAttribute('data-card-style',    theme.cardStyle)
    root.setAttribute('data-density',       theme.density)

    // Font
    const font = theme.font ?? 'inter'
    root.setAttribute('data-font', font)
    document.cookie = `forge-font=${font}; path=/; max-age=31536000; SameSite=Lax`

    // Dark mode
    let mode = theme.mode
    if (mode === 'system') {
      mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    if (mode === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    document.cookie = `forge-theme-mode=${mode}; path=/; max-age=31536000; SameSite=Lax`
  }, [theme])

  return <>{children}</>
}
