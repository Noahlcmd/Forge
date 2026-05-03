-- ============================================================
-- Leads table + RLS (Phase 3)
-- Safe to run on a project that already ran schema.sql
-- ============================================================

-- Create table for fresh projects
CREATE TABLE IF NOT EXISTS public.leads (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id      uuid        REFERENCES public.customers(id) ON DELETE SET NULL,
  company_name     text,
  industry         text,
  location         text,
  company_size     text,
  revenue_estimate text,
  contact_name     text,
  score            int,
  status           text        NOT NULL DEFAULT 'new',
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns for projects that ran the old schema.sql
-- (old schema had different column names; IF NOT EXISTS makes this idempotent)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_id      uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_name     text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_size     text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS revenue_estimate text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS contact_name     text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS score            int;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status           text DEFAULT 'new';

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies by every possible name used across migrations
DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;

-- Inline subquery — no dependency on helper functions
CREATE POLICY "leads_select" ON public.leads FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "leads_insert" ON public.leads FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "leads_update" ON public.leads FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "leads_delete" ON public.leads FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND accepted_at IS NOT NULL
    )
  );

-- Explicit grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT                          ON public.leads TO anon;
