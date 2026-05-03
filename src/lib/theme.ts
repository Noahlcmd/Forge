export type FontOption = 'inter' | 'poppins' | 'roboto' | 'system'

export interface OrgTheme {
  mode: 'dark' | 'light' | 'system'
  primaryColor: string
  accentColor: string
  sidebarStyle: 'compact' | 'expanded'
  cardStyle: 'rounded' | 'sharp'
  density: 'comfortable' | 'compact'
  font: FontOption
}

export const DEFAULT_THEME: OrgTheme = {
  mode: 'dark',
  primaryColor: '#f97316',
  accentColor: '#f97316',
  sidebarStyle: 'expanded',
  cardStyle: 'rounded',
  density: 'comfortable',
  font: 'inter',
}

export function mergeTheme(partial: Partial<OrgTheme> | null | undefined): OrgTheme {
  return { ...DEFAULT_THEME, ...(partial ?? {}) }
}
