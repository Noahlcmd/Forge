/**
 * Format a cent-based integer as a locale-aware currency string.
 * Uses Intl.NumberFormat — safe to call on both server and client.
 */
export function formatMoney(cents: number, currency = 'USD', opts?: { decimals?: boolean }): string {
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency,
    maximumFractionDigits: opts?.decimals === false ? 0 : 2,
    minimumFractionDigits: opts?.decimals === false ? 0 : 2,
  }).format(cents / 100)
}

export const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'] as const
export type CurrencyCode = typeof VALID_CURRENCIES[number]
