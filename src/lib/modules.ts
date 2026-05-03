import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Users, Target, UserSearch, Mail, DollarSign,
  Calendar, MessageSquare, Megaphone, Boxes, Briefcase, BookOpen,
  Wrench, Truck, CheckSquare, StickyNote, FolderOpen, Kanban,
} from 'lucide-react'

export interface Module {
  id: string
  name: string
  description: string
  icon: LucideIcon
  href: string
  color: string
  bg: string
  core: boolean
  workspace: boolean
}

export const MODULES: Module[] = [
  { id: 'dashboard',       name: 'Dashboard',       description: 'Overview and KPIs',              icon: LayoutDashboard, href: '/dashboard',            color: 'text-orange-400', bg: 'bg-orange-400/10', core: true,  workspace: false },
  { id: 'customers',       name: 'Customers',        description: 'Manage client relationships',    icon: Users,           href: '/customers',            color: 'text-blue-400',   bg: 'bg-blue-400/10',   core: false, workspace: false },
  { id: 'leads',           name: 'Leads',            description: 'Track your pipeline',            icon: Target,          href: '/leads',                color: 'text-purple-400', bg: 'bg-purple-400/10', core: false, workspace: false },
  { id: 'finding-clients', name: 'Finding Clients',  description: 'Discover new prospects',         icon: UserSearch,      href: '/finding-clients',      color: 'text-indigo-400', bg: 'bg-indigo-400/10', core: false, workspace: false },
  { id: 'outreach',        name: 'Outreach',         description: 'Email sequences and follow-ups', icon: Mail,            href: '/outreach',             color: 'text-orange-400', bg: 'bg-orange-400/10', core: false, workspace: false },
  { id: 'finances',        name: 'Finances',         description: 'Revenue and expenses',           icon: DollarSign,      href: '/finances',             color: 'text-green-400',  bg: 'bg-green-400/10',  core: false, workspace: false },
  { id: 'calendar',        name: 'Calendar',         description: 'Schedule and events',            icon: Calendar,        href: '/calendar',             color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   core: false, workspace: false },
  { id: 'chat',            name: 'Chat',             description: 'Team messaging',                 icon: MessageSquare,   href: '/chat',                 color: 'text-violet-400', bg: 'bg-violet-400/10', core: false, workspace: false },
  { id: 'ads',             name: 'Ads',              description: 'AI campaign builder',            icon: Megaphone,       href: '/ads',                  color: 'text-pink-400',   bg: 'bg-pink-400/10',   core: false, workspace: false },
  { id: 'workspace',       name: 'Workspace',        description: 'Custom modules',                 icon: Boxes,           href: '/workspace',            color: 'text-zinc-400',   bg: 'bg-zinc-700/60',   core: true,  workspace: false },
  // Workspace-only modules
  { id: 'inventory',       name: 'Inventory',        description: 'Track stock and products',       icon: Boxes,           href: '/workspace/inventory',  color: 'text-amber-400',  bg: 'bg-amber-400/10',  core: false, workspace: true },
  { id: 'projects',        name: 'Projects',         description: 'Manage projects and milestones', icon: Briefcase,       href: '/workspace/projects',   color: 'text-blue-400',   bg: 'bg-blue-400/10',   core: false, workspace: true },
  { id: 'tasks',           name: 'Tasks',            description: 'Manage team tasks and to-dos',   icon: CheckSquare,     href: '/workspace/tasks',      color: 'text-green-400',  bg: 'bg-green-400/10',  core: false, workspace: true },
  { id: 'notes',           name: 'Notes',            description: 'Quick notes and documents',      icon: StickyNote,      href: '/workspace/notes',      color: 'text-yellow-500', bg: 'bg-yellow-400/10', core: false, workspace: true },
  { id: 'ai-assistant',    name: 'AI Assistant',     description: 'AI advisor powered by your data', icon: BookOpen,        href: '/workspace/ai-assistant', color: 'text-teal-400', bg: 'bg-teal-400/10',   core: false, workspace: true },
  { id: 'equipment',       name: 'Equipment',        description: 'Track company equipment',        icon: Wrench,          href: '/workspace/equipment',  color: 'text-orange-400', bg: 'bg-orange-400/10', core: false, workspace: true },
  { id: 'suppliers',       name: 'Suppliers',        description: 'Manage supplier database',       icon: Truck,           href: '/workspace/suppliers',     color: 'text-rose-400',   bg: 'bg-rose-400/10',   core: false, workspace: true },
  { id: 'files',           name: 'Files',            description: 'Store and share documents',      icon: FolderOpen,      href: '/workspace/files',         color: 'text-sky-400',    bg: 'bg-sky-400/10',    core: false, workspace: true },
  { id: 'crm-pipelines',   name: 'CRM Pipelines',    description: 'Visual deal pipeline tracking',  icon: Kanban,          href: '/workspace/crm-pipelines', color: 'text-violet-400', bg: 'bg-violet-400/10', core: false, workspace: true },
]

export const MODULE_MAP = Object.fromEntries(MODULES.map(m => [m.id, m])) as Record<string, Module>

// Which modules are enabled by default for each business type
export const BUSINESS_TYPE_MODULES: Record<string, string[]> = {
  agency:     ['dashboard', 'workspace', 'customers', 'leads', 'finding-clients', 'outreach', 'ads', 'calendar', 'chat'],
  freelancer: ['dashboard', 'workspace', 'customers', 'leads', 'outreach', 'finances', 'calendar'],
  startup:    ['dashboard', 'workspace', 'customers', 'leads', 'finding-clients', 'finances', 'ads', 'chat'],
  ecommerce:  ['dashboard', 'workspace', 'customers', 'finances', 'ads', 'inventory'],
  consulting: ['dashboard', 'workspace', 'customers', 'leads', 'outreach', 'finances', 'calendar'],
  accounting: ['dashboard', 'workspace', 'customers', 'finances', 'calendar'],
  other:      ['dashboard', 'workspace', 'customers', 'leads', 'outreach', 'finances', 'calendar'],
}

// All non-workspace nav modules (shown by default before onboarding)
export const ALL_NAV_MODULES = MODULES
  .filter(m => !m.workspace)
  .map(m => m.id)

export interface OpsAnswers {
  client_acquisition: string[]
  runs_ads: boolean
  ad_budget: string
  manages_inventory: boolean
  sends_invoices: boolean
  manages_team: boolean
  team_size: string
  needs_crm: boolean
  needs_automation: boolean
  wants_ai: boolean
}

export function computeEnabledModules(
  businessType: string | null,
  ops: Partial<OpsAnswers> = {}
): string[] {
  const base = BUSINESS_TYPE_MODULES[businessType ?? 'other'] ?? BUSINESS_TYPE_MODULES.other
  const extras = new Set(base)

  if (ops.manages_inventory)              extras.add('inventory')
  if (ops.needs_crm)                     { extras.add('customers'); extras.add('leads') }
  if (ops.needs_automation)              { extras.add('outreach'); extras.add('finding-clients') }
  if (ops.runs_ads || ops.wants_ai)       extras.add('ads')
  if (ops.sends_invoices)                 extras.add('finances')
  if (ops.manages_team)                  { extras.add('chat'); extras.add('workspace') }
  if ((ops.client_acquisition ?? []).includes('outbound')) extras.add('finding-clients')
  if ((ops.client_acquisition ?? []).includes('ads'))      extras.add('ads')

  return Array.from(extras)
}
