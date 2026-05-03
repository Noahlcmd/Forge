-- Migration 009: Expand integrations provider list
-- Drops the old check constraint and adds a wider one to support
-- Google Ads, Meta Ads, LinkedIn Ads, TikTok Ads, Slack, Shopify, Webhook.

ALTER TABLE public.integrations
  DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN (
    'gmail', 'outlook', 'stripe', 'google_calendar', 'apollo', 'hunter',
    'google_ads', 'meta_ads', 'linkedin_ads', 'tiktok_ads',
    'slack', 'shopify', 'webhook'
  ));
