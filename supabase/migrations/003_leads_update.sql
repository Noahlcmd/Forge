-- ============================================================
-- Leads table v2 — adds email, phone, company, size, revenue
-- Safe to run whether or not 002_leads.sql was previously run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company          text,
  contact_name     text,
  email            text,
  phone            text,
  industry         text,
  location         text,
  size             text,
  revenue          text,
  score            int,
  status           text        NOT NULL DEFAULT 'new',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- For installs that ran 002_leads.sql — add missing columns idempotently
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company      text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email        text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone        text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS size         text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS revenue      text;

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop all known policy names from previous migrations
DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;

CREATE POLICY "leads_select" ON public.leads FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "leads_insert" ON public.leads FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "leads_update" ON public.leads FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "leads_delete" ON public.leads FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT SELECT                          ON public.leads TO anon;
