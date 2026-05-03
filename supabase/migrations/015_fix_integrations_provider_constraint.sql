-- Migration 015: Re-apply integrations provider constraint (idempotent)
-- Ensures all 13 providers from VALID_PROVIDERS in the API are allowed.

ALTER TABLE public.integrations
  DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN (
    'gmail', 'outlook', 'stripe', 'google_calendar', 'apollo', 'hunter',
    'google_ads', 'meta_ads', 'linkedin_ads', 'tiktok_ads', 'slack', 'shopify', 'webhook'
  ));
