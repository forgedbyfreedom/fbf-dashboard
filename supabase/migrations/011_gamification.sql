-- Gamification: badge definitions, client streaks, client badges

-- Badge definitions (seeded with 14 badges across 4 categories)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('streak', 'checkins', 'targets', 'lifestyle')),
  icon text NOT NULL DEFAULT 'trophy',
  threshold_json jsonb NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Client streaks (one row per client, upserted on each check-in)
CREATE TABLE IF NOT EXISTS client_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  current_streak int NOT NULL DEFAULT 0,
  best_streak int NOT NULL DEFAULT 0,
  total_checkins int NOT NULL DEFAULT 0,
  last_checkin_date date,
  updated_at timestamptz DEFAULT now()
);

-- Client badges (junction table)
CREATE TABLE IF NOT EXISTS client_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  notified boolean DEFAULT false,
  UNIQUE(client_id, badge_id)
);

-- Add leaderboard opt-in to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS leaderboard_opt_in boolean DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_streaks_client_id ON client_streaks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_streaks_current ON client_streaks(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_client_badges_client_id ON client_badges(client_id);
CREATE INDEX IF NOT EXISTS idx_client_badges_badge_id ON client_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_category ON badge_definitions(category);

-- RLS
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_badges ENABLE ROW LEVEL SECURITY;

-- Badge definitions are readable by everyone (public catalog)
CREATE POLICY "Badge definitions are publicly readable"
  ON badge_definitions FOR SELECT
  USING (true);

-- Client streaks: users can read their own
CREATE POLICY "Users can read their own streaks"
  ON client_streaks FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Client badges: users can read their own
CREATE POLICY "Users can read their own badges"
  ON client_badges FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Allow service role full access (admin client bypasses RLS anyway, but explicit)
CREATE POLICY "Service role manages streaks"
  ON client_streaks FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role manages badges"
  ON client_badges FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed badge definitions
INSERT INTO badge_definitions (slug, name, description, category, icon, threshold_json, sort_order) VALUES
  -- Streak badges
  ('spark',               'Spark',                '3-day check-in streak',                    'streak',    'flame',       '{"streak": 3}',                    1),
  ('on_fire',             'On Fire',              '7-day check-in streak',                    'streak',    'fire',        '{"streak": 7}',                    2),
  ('unstoppable',         'Unstoppable',          '14-day check-in streak',                   'streak',    'zap',         '{"streak": 14}',                   3),
  ('iron_will',           'Iron Will',            '30-day check-in streak',                   'streak',    'shield',      '{"streak": 30}',                   4),
  ('diamond_discipline',  'Diamond Discipline',   '60-day check-in streak',                   'streak',    'diamond',     '{"streak": 60}',                   5),
  ('centurion',           'Centurion',            '100-day check-in streak',                  'streak',    'crown',       '{"streak": 100}',                  6),
  -- Check-in total badges
  ('getting_started',     'Getting Started',      '10 total check-ins',                       'checkins',  'rocket',      '{"total_checkins": 10}',            7),
  ('committed',           'Committed',            '50 total check-ins',                       'checkins',  'target',      '{"total_checkins": 50}',            8),
  ('century_club',        'Century Club',         '100 total check-ins',                      'checkins',  'award',       '{"total_checkins": 100}',           9),
  -- Target adherence badges
  ('protein_pro',         'Protein Pro',          'Hit protein target 7 days in a row',       'targets',   'beef',        '{"target_type": "protein", "days": 7}', 10),
  ('calorie_commander',   'Calorie Commander',    'Hit calorie target 7 days in a row',       'targets',   'utensils',    '{"target_type": "calories", "days": 7}', 11),
  ('step_master',         'Step Master',          'Hit step target 7 days in a row',          'targets',   'footprints',  '{"target_type": "steps", "days": 7}',   12),
  -- Lifestyle badges
  ('sleep_champion',      'Sleep Champion',       '7 consecutive days of 8+ hours sleep',     'lifestyle', 'moon',        '{"metric": "sleep_hours", "min_value": 8, "days": 7}', 13),
  ('beast_mode',          'Beast Mode',           '7 consecutive days of training',           'lifestyle', 'dumbbell',    '{"metric": "training_done", "days": 7}',               14)
ON CONFLICT (slug) DO NOTHING;
