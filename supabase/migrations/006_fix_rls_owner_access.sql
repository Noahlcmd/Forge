-- Fix: remove accepted_at IS NOT NULL from RLS helper functions and policies.
-- Org owners created before trigger fix may have NULL accepted_at.
-- Removing the filter makes access purely role/user-based (no invite-state dependency).

-- ── Helper functions ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.my_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.memberships
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id         = auth.uid()
      AND organization_id = org_id
      AND role            IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id         = auth.uid()
      AND organization_id = org_id
      AND role            = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.my_role(org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role
  FROM public.memberships
  WHERE user_id         = auth.uid()
    AND organization_id = org_id
  LIMIT 1;
$$;

-- ── customers ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;

CREATE POLICY "customers_select" ON public.customers FOR SELECT
  USING (organization_id IN (SELECT public.my_org_ids()));

CREATE POLICY "customers_insert" ON public.customers FOR INSERT
  WITH CHECK (public.is_admin_or_owner(organization_id));

CREATE POLICY "customers_update" ON public.customers FOR UPDATE
  USING (organization_id IN (SELECT public.my_org_ids()))
  WITH CHECK (public.is_admin_or_owner(organization_id));

CREATE POLICY "customers_delete" ON public.customers FOR DELETE
  USING (public.is_admin_or_owner(organization_id));

-- ── leads ─────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_insert" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;

CREATE POLICY "leads_select" ON public.leads FOR SELECT
  USING (organization_id IN (SELECT public.my_org_ids()));

CREATE POLICY "leads_insert" ON public.leads FOR INSERT
  WITH CHECK (organization_id IN (SELECT public.my_org_ids()));

CREATE POLICY "leads_update" ON public.leads FOR UPDATE
  USING (organization_id IN (SELECT public.my_org_ids()));

CREATE POLICY "leads_delete" ON public.leads FOR DELETE
  USING (public.is_admin_or_owner(organization_id));

-- ── Backfill: set name from company for leads where name is NULL ──────────────

UPDATE public.leads
SET name = company
WHERE name IS NULL AND company IS NOT NULL;
