'use client'

import { useState } from 'react'
import { GeneralTab }      from './GeneralTab'
import { AppearanceTab }   from './AppearanceTab'
import { ModulesTab }      from './ModulesTab'
import { TeamTab }         from './TeamTab'
import { IntegrationsTab } from './IntegrationsTab'
import type { AppUserProfile, AppUserMembership } from '@/lib/auth/getAppUser'
import type { OrgTheme } from '@/lib/theme'
import type { MemberWithProfile } from '@/types'

const TABS = [
  { id: 'general',      label: 'General'      },
  { id: 'appearance',   label: 'Appearance'   },
  { id: 'modules',      label: 'Modules'      },
  { id: 'team',         label: 'Team'         },
  { id: 'integrations', label: 'Integrations' },
  { id: 'billing',      label: 'Billing'      },
]

interface Props {
  profile:     AppUserProfile
  membership:  AppUserMembership
  theme:       OrgTheme
  members:     MemberWithProfile[]
  invitations: { id: string; email: string; role: string; expires_at: string; created_at: string }[]
  initialTab?: string
}

const VALID_TABS = new Set(['general', 'appearance', 'modules', 'team', 'integrations', 'billing'])

export function SettingsShell({ profile, membership, theme, members, invitations, initialTab }: Props) {
  const [tab, setTab] = useState<string>(
    initialTab && VALID_TABS.has(initialTab) ? initialTab : 'general'
  )

  return (
    <div className="max-w-3xl">
      {/* Tab nav */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--card-border)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 500,
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -1,
              background: 'transparent',
              color: tab === t.id ? 'var(--color-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general'    && <GeneralTab    profile={profile} membership={membership} />}
      {tab === 'appearance' && <AppearanceTab theme={theme} />}
      {tab === 'modules'    && <ModulesTab    enabledModules={membership.organizations.enabled_modules} />}
      {tab === 'team'         && <TeamTab         role={membership.role} members={members} invitations={invitations} currentUserId={profile.id} />}
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'billing'      && (
        <div className="space-y-4">
          <div className="forge-card p-6">
            <h2 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Billing</h2>
            <p className="text-[13px] mb-5" style={{ color: 'var(--text-muted)' }}>Manage your subscription and payment method.</p>
            <a href="/billing" className="btn btn-secondary btn-sm">
              Manage Billing
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
