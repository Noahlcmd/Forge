import type { OrgTheme } from '@/lib/theme'

export type Role = 'owner' | 'admin' | 'employee'
export type { OrgTheme }

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive'

export interface OrgSettings {
  onboarding_completed?: boolean
  business_type?: string
  main_goal?: string
  client_acquisition?: string[]
  runs_ads?: boolean
  ad_budget?: string
  manages_inventory?: boolean
  sends_invoices?: boolean
  manages_team?: boolean
  team_size?: string
  needs_crm?: boolean
  needs_automation?: boolean
  wants_ai?: boolean
  onboarding_at?: string
  [key: string]: unknown
}

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  industry: string | null
  business_type: string | null
  onboarding_completed: boolean
  enabled_modules: string[]
  theme: OrgTheme | null
  stripe_customer_id: string | null
  subscription_status: SubscriptionStatus
  subscription_plan: string | null
  trial_ends_at: string | null
  settings: OrgSettings
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Membership {
  id: string
  user_id: string
  organization_id: string
  role: Role
  invited_by: string | null
  accepted_at: string | null
  created_at: string
}

export interface Invitation {
  id: string
  organization_id: string
  email: string
  role: 'admin' | 'employee'
  token: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
  created_at: string
}

export interface MemberWithProfile {
  id: string
  role: Role
  accepted_at: string | null
  user_id: string
  profiles: { email: string; full_name: string | null; avatar_url: string | null } | null
}

export interface Customer {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: 'active' | 'inactive' | 'churned'
  notes: string | null
  tags: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export type LeadStage =
  | 'not_contacted'
  | 'first_email_sent'
  | 'follow_up_1'
  | 'follow_up_2'
  | 'follow_up_3'
  | 'replied'
  | 'meeting_booked'
  | 'proposal_sent'
  | 'won'
  | 'lost'

export interface Lead {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  website: string | null
  stage: LeadStage
  source: string | null
  assigned_to: string | null
  notes: string | null
  tags: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Integration {
  id: string
  organization_id: string
  provider: 'gmail' | 'outlook' | 'stripe' | 'google_calendar' | 'apollo' | 'hunter'
  status: 'connected' | 'disconnected' | 'error'
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}
