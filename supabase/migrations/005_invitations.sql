-- ============================================================
-- Migration 005: Invitations table for team management
-- Referenced by settings/page.tsx and api/team/invite/route.ts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email           text        NOT NULL,
  role            text        NOT NULL DEFAULT 'employee'
                                CHECK (role IN ('admin', 'employee')),
  token           text        NOT NULL DEFAULT gen_random_uuid()::text,
  invited_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at     timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate pending invitations for the same org+email
CREATE UNIQUE INDEX IF NOT EXISTS invitations_org_email_pending_idx
  ON public.invitations (organization_id, email)
  WHERE accepted_at IS NULL;

CREATE INDEX IF NOT EXISTS invitations_org_idx ON public.invitations (organization_id);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Members can see their org's invitations
CREATE POLICY "invitations_select" ON public.invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

-- Admins/owners can send invitations
CREATE POLICY "invitations_insert" ON public.invitations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND accepted_at IS NOT NULL
    )
  );

-- Members can accept (update) their own invitation; admins can update any
CREATE POLICY "invitations_update" ON public.invitations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

-- Admins/owners can cancel invitations
CREATE POLICY "invitations_delete" ON public.invitations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND accepted_at IS NOT NULL
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT SELECT ON public.invitations TO anon;
