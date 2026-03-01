-- SMS opt-in for clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_opt_in boolean DEFAULT false;

-- SMS message log
CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  coach_user_id uuid REFERENCES profiles(id),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number text NOT NULL,
  to_number text NOT NULL,
  body text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('checkin', 'chat', 'reminder', 'motivational', 'status_reply', 'unknown')),
  twilio_sid text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_client ON sms_messages(client_id, created_at DESC);

-- Motivational messages pool
CREATE TABLE IF NOT EXISTS motivational_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  category text NOT NULL CHECK (category IN ('discipline', 'nutrition', 'training', 'mindset', 'recovery')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed motivational messages
INSERT INTO motivational_messages (message, category) VALUES
  -- Discipline
  ('Discipline is choosing between what you want now and what you want most. Stay locked in.', 'discipline'),
  ('Nobody cares. Work harder.', 'discipline'),
  ('You don''t have to be extreme. Just consistent.', 'discipline'),
  ('The pain of discipline weighs ounces. The pain of regret weighs tons.', 'discipline'),
  ('Champions aren''t made in the gym. They are made from something deep inside — a desire, a dream, a vision.', 'discipline'),
  ('Small daily improvements over time lead to stunning results.', 'discipline'),
  ('Motivation gets you started. Discipline keeps you going.', 'discipline'),

  -- Training
  ('Your body can stand almost anything. It''s your mind you have to convince.', 'training'),
  ('The only bad workout is the one that didn''t happen. Get after it today.', 'training'),
  ('Train insane or remain the same.', 'training'),
  ('The iron never lies. 225 is always 225. Get in there and move weight.', 'training'),
  ('Every rep counts. Every set matters. Make today''s session one to remember.', 'training'),
  ('You''re one workout away from a better mood. Let''s go.', 'training'),
  ('Push yourself because no one else is going to do it for you.', 'training'),

  -- Nutrition
  ('You can''t out-train a bad diet. Eat like the athlete you want to become.', 'nutrition'),
  ('Fuel the machine. Hit your macros today — no excuses.', 'nutrition'),
  ('Abs are built in the kitchen. Stay disciplined with your meals.', 'nutrition'),
  ('Protein first. Every meal, every time.', 'nutrition'),
  ('Water is your best supplement. Stay hydrated, stay strong.', 'nutrition'),
  ('Meal prep is self-care. Set yourself up for success this week.', 'nutrition'),

  -- Mindset
  ('Forged by freedom. Strengthened by discipline. Built by choice.', 'mindset'),
  ('Success isn''t given. It''s earned. On the track, on the field, in the gym.', 'mindset'),
  ('The difference between who you are and who you want to be is what you do.', 'mindset'),
  ('Don''t wish for it. Work for it.', 'mindset'),
  ('Your only limit is you. Break through it.', 'mindset'),
  ('Progress, not perfection. Trust the process.', 'mindset'),
  ('The body achieves what the mind believes.', 'mindset'),

  -- Recovery
  ('Rest is not weakness. Recovery is where growth happens.', 'recovery'),
  ('Sleep is the most anabolic thing you can do. Get your 7-8 hours tonight.', 'recovery'),
  ('Stretch, hydrate, sleep. Your body is a weapon — maintain it.', 'recovery'),
  ('Recovery days make you stronger. Don''t skip them.', 'recovery'),
  ('Listen to your body. Push hard, recover harder.', 'recovery');

-- RLS policies for sms_messages
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches see SMS for assigned clients" ON sms_messages
  FOR SELECT USING (
    coach_user_id = auth.uid()
    OR client_id IN (
      SELECT client_id FROM client_coach_assignments WHERE coach_user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins see all SMS" ON sms_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members WHERE user_id = auth.uid() AND role = 'org_admin'
    )
  );

-- RLS for motivational_messages (readable by all authenticated users)
ALTER TABLE motivational_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read motivational messages" ON motivational_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);
