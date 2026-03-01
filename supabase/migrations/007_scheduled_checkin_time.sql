-- Add time field to scheduled_checkins
ALTER TABLE scheduled_checkins ADD COLUMN IF NOT EXISTS scheduled_time text;
