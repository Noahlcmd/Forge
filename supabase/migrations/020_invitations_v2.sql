-- ============================================================
-- Migration 020: Harden invitations for production invite system
-- ============================================================

-- 1. Shorten expiry to 24 hours (was 7 days)
ALTER TABLE public.invitations
  ALTER COLUMN expires_at SET DEFAULT now() + interval '24 hours';

-- 2. Add revoked_at so admins can cancel without hard-deleting
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

-- 3. Enforce uniqueness on token (gen_random_uuid is already unique, but make it explicit)
ALTER TABLE public.invitations
  ADD CONSTRAINT IF NOT EXISTS invitations_token_key UNIQUE (token);

-- 4. Allow anonymous reads (token is the secret — anyone with it may look it up)
--    Already granted in migration 005 but included here for completeness.
GRANT SELECT ON public.invitations TO anon;

-- 5. Allow the accept API (running as the authenticated user) to update their own invite.
--    The existing policy uses org membership to restrict updates, but an invitee
--    hasn't joined yet — so they can't match that policy.
--    We use a token-based policy instead.
DROP POLICY IF EXISTS "invitations_update" ON public.invitations;

CREATE POLICY "invitations_update" ON public.invitations FOR UPDATE
  USING (
    -- Org admins/owners can update any invite (e.g. revoke)
    organization_id IN (
      SELECT organization_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
        AND accepted_at IS NOT NULL
    )
    OR
    -- The invitee can accept their own invite (matched by email)
    email = (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
  );
