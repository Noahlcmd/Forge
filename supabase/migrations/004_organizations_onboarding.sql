-- ============================================================
-- Migration 004: Add onboarding + module columns to organizations
--
-- Root cause: onboarding route POSTs to update these columns but
-- schema.sql never defined them. Safe to run on any existing DB.
-- ============================================================

-- Onboarding state
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Business profile
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS industry      text,
  ADD COLUMN IF NOT EXISTS business_type text;

-- Module activation — empty array means pre-onboarding (show all)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS enabled_modules text[] NOT NULL DEFAULT '{}';

-- Org theme overrides (accent colour, etc.)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}';
