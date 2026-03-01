-- Add daily performance rating to checkins
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS performance_rating int
  CHECK (performance_rating BETWEEN 1 AND 10);
