-- ============================================================
-- Migration 004: Chat System & Avatar Storage
-- ============================================================

-- 1. AVATAR STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('avatars', 'avatars', true, 5242880)  -- 5 MiB
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone authenticated can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- Public read for avatars (since bucket is public)
CREATE POLICY "Public avatar read"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'avatars');

-- 2. CHAT CHANNELS
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL DEFAULT 'General',
  type text NOT NULL CHECK (type IN ('group', 'dm')) DEFAULT 'group',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

-- Org members can see channels in their org
CREATE POLICY "Org members can view channels"
ON chat_channels FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  )
  OR
  organization_id IN (
    SELECT organization_id FROM clients WHERE user_id = auth.uid()
  )
);

-- Coaches/admins can create channels
CREATE POLICY "Coaches can create channels"
ON chat_channels FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM org_members WHERE user_id = auth.uid()
  )
);

-- 3. CHAT MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;

-- Users can see memberships for channels they're in
CREATE POLICY "Members can view channel members"
ON chat_members FOR SELECT
TO authenticated
USING (
  channel_id IN (
    SELECT channel_id FROM chat_members WHERE user_id = auth.uid()
  )
);

-- Coaches can add members
CREATE POLICY "Coaches can add members"
ON chat_members FOR INSERT
TO authenticated
WITH CHECK (
  channel_id IN (
    SELECT cc.id FROM chat_channels cc
    JOIN org_members om ON om.organization_id = cc.organization_id
    WHERE om.user_id = auth.uid()
  )
);

-- 4. CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in channels they're members of
CREATE POLICY "Members can view messages"
ON chat_messages FOR SELECT
TO authenticated
USING (
  channel_id IN (
    SELECT channel_id FROM chat_members WHERE user_id = auth.uid()
  )
);

-- Users can send messages to channels they're members of
CREATE POLICY "Members can send messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND channel_id IN (
    SELECT channel_id FROM chat_members WHERE user_id = auth.uid()
  )
);

-- 5. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chat_channels_org ON chat_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON chat_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(channel_id, created_at DESC);

-- 6. ENABLE REALTIME ON CHAT MESSAGES
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 7. AUTO-CREATE GENERAL CHANNEL PER ORG
-- ============================================================
-- Create a "General" channel for each existing org that doesn't have one
INSERT INTO chat_channels (organization_id, name, type)
SELECT id, 'General', 'group'
FROM organizations
WHERE id NOT IN (
  SELECT organization_id FROM chat_channels WHERE name = 'General' AND type = 'group'
);

-- Function to auto-create General channel when new org is created
CREATE OR REPLACE FUNCTION create_general_channel()
RETURNS trigger AS $$
BEGIN
  INSERT INTO chat_channels (organization_id, name, type)
  VALUES (NEW.id, 'General', 'group');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_org_created_create_channel
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_general_channel();

-- Auto-add org members to General channel when they join
CREATE OR REPLACE FUNCTION auto_join_general_channel()
RETURNS trigger AS $$
BEGIN
  INSERT INTO chat_members (channel_id, user_id)
  SELECT cc.id, NEW.user_id
  FROM chat_channels cc
  WHERE cc.organization_id = NEW.organization_id
    AND cc.name = 'General'
    AND cc.type = 'group'
  ON CONFLICT (channel_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_org_member_join_channel
  AFTER INSERT ON org_members
  FOR EACH ROW EXECUTE FUNCTION auto_join_general_channel();

-- Auto-add clients with user accounts to General channel
CREATE OR REPLACE FUNCTION auto_join_client_general_channel()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO chat_members (channel_id, user_id)
    SELECT cc.id, NEW.user_id
    FROM chat_channels cc
    WHERE cc.organization_id = NEW.organization_id
      AND cc.name = 'General'
      AND cc.type = 'group'
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_client_join_channel
  AFTER INSERT OR UPDATE OF user_id ON clients
  FOR EACH ROW EXECUTE FUNCTION auto_join_client_general_channel();

-- Backfill: add all existing org members to General channels
INSERT INTO chat_members (channel_id, user_id)
SELECT cc.id, om.user_id
FROM chat_channels cc
JOIN org_members om ON om.organization_id = cc.organization_id
WHERE cc.name = 'General' AND cc.type = 'group'
ON CONFLICT (channel_id, user_id) DO NOTHING;

-- Backfill: add all existing clients with user accounts to General channels
INSERT INTO chat_members (channel_id, user_id)
SELECT cc.id, c.user_id
FROM chat_channels cc
JOIN clients c ON c.organization_id = cc.organization_id
WHERE cc.name = 'General' AND cc.type = 'group' AND c.user_id IS NOT NULL
ON CONFLICT (channel_id, user_id) DO NOTHING;
