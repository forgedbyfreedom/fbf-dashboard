-- ============================================================
-- Migration 012: Fix Chat RLS Infinite Recursion
-- ============================================================
-- The chat_members SELECT policy referenced itself, causing
-- infinite recursion. Fix: use a SECURITY DEFINER function
-- that bypasses RLS to look up the user's channel memberships.

-- 1. Helper function: returns channel_ids the caller belongs to
-- SECURITY DEFINER runs as the function owner (superuser),
-- bypassing RLS and breaking the recursion cycle.
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_channel_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT channel_id FROM chat_members WHERE user_id = p_user_id;
$$;

-- 2. Drop the problematic chat_members SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Members can view channel members" ON chat_members;

-- Recreate without self-reference
CREATE POLICY "Members can view channel members"
ON chat_members FOR SELECT
TO authenticated
USING (
  channel_id IN (SELECT get_user_channel_ids(auth.uid()))
);

-- 3. Fix chat_messages policies that also hit the recursion
-- ============================================================
DROP POLICY IF EXISTS "Members can view messages" ON chat_messages;

CREATE POLICY "Members can view messages"
ON chat_messages FOR SELECT
TO authenticated
USING (
  channel_id IN (SELECT get_user_channel_ids(auth.uid()))
);

DROP POLICY IF EXISTS "Members can send messages" ON chat_messages;

CREATE POLICY "Members can send messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND channel_id IN (SELECT get_user_channel_ids(auth.uid()))
);
