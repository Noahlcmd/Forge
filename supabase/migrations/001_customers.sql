-- customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text,
  phone           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (handles both schema.sql and old migration names)
DROP POLICY IF EXISTS "customers_select"                ON public.customers;
DROP POLICY IF EXISTS "customers_insert"                ON public.customers;
DROP POLICY IF EXISTS "customers_update"                ON public.customers;
DROP POLICY IF EXISTS "customers_delete"                ON public.customers;
DROP POLICY IF EXISTS "customers: org members can select" ON public.customers;
DROP POLICY IF EXISTS "customers: org members can insert" ON public.customers;
DROP POLICY IF EXISTS "customers: org members can update" ON public.customers;
DROP POLICY IF EXISTS "customers: org members can delete" ON public.customers;

-- Inline subquery — no dependency on helper functions
CREATE POLICY "customers_select" ON public.customers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "customers_insert" ON public.customers FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "customers_update" ON public.customers FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "customers_delete" ON public.customers FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND accepted_at IS NOT NULL
    )
  );

-- Explicit grants in case default privileges aren't applied
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT                          ON public.customers TO anon;
