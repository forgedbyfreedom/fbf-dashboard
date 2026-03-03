-- ============================================
-- FBF Dashboard - Seed Data
-- ============================================
-- Run: psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed.sql

-- ============================================
-- 1. Organization
-- ============================================
INSERT INTO organizations (id, name)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Forged By Freedom')
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. Auth Users (coach accounts)
-- ============================================
-- Bryan Antonelli
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  aud, role, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'bryan@forgedbyfreedom.org',
  crypt('Forged1', gen_salt('bf')),
  now(), '{"full_name": "Bryan Antonelli"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated', now(), now(),
  '', '',
  '', '', '',
  '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Wendy Antonelli
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
  aud, role, created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) VALUES (
  'b0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'wendy@forgedbyfreedom.org',
  crypt('Forged1', gen_salt('bf')),
  now(), '{"full_name": "Wendy Antonelli"}'::jsonb,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  'authenticated', 'authenticated', now(), now(),
  '', '',
  '', '', '',
  '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Identities for email login
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'b0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  'email',
  '{"sub": "b0000000-0000-0000-0000-000000000001", "email": "bryan@forgedbyfreedom.org"}'::jsonb,
  now(), now(), now()
) ON CONFLICT DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'b0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'email',
  '{"sub": "b0000000-0000-0000-0000-000000000002", "email": "wendy@forgedbyfreedom.org"}'::jsonb,
  now(), now(), now()
) ON CONFLICT DO NOTHING;

-- ============================================
-- 3. Profiles (trigger should create, but ensure)
-- ============================================
INSERT INTO profiles (id, email, full_name)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'bryan@forgedbyfreedom.org', 'Bryan Antonelli'),
  ('b0000000-0000-0000-0000-000000000002', 'wendy@forgedbyfreedom.org', 'Wendy Antonelli')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. Org Members
-- ============================================
INSERT INTO org_members (organization_id, user_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'org_admin'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'coach')
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. Clients
-- ============================================
-- Bryan's clients (4)
INSERT INTO clients (id, organization_id, first_name, last_name, email, target_calories, target_protein, target_steps, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Mike', 'Torres', 'mike.torres@example.com', 2800, 210, 10000, true),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Sarah', 'Chen', 'sarah.chen@example.com', 1800, 130, 8000, true),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Jake', 'Morrison', 'jake.morrison@example.com', 3200, 240, 8000, true),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Emily', 'Rodriguez', 'emily.rodriguez@example.com', 2000, 145, 10000, true);

-- Wendy's clients (2)
INSERT INTO clients (id, organization_id, first_name, last_name, email, target_calories, target_protein, target_steps, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Chris', 'Blackwell', 'chris.blackwell@example.com', 2500, 200, 8000, true),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Amanda', 'Foster', 'amanda.foster@example.com', 1600, 120, 10000, true);

-- ============================================
-- 6. Coach Assignments
-- ============================================
INSERT INTO client_coach_assignments (client_id, coach_user_id) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002');

-- ============================================
-- 7. Magic Links
-- ============================================
INSERT INTO client_links (client_id, token_hash, status) VALUES
  ('c0000000-0000-0000-0000-000000000001', encode(sha256('mike-demo-token'::bytea), 'hex'), 'active'),
  ('c0000000-0000-0000-0000-000000000002', encode(sha256('sarah-demo-token'::bytea), 'hex'), 'active'),
  ('c0000000-0000-0000-0000-000000000003', encode(sha256('jake-demo-token'::bytea), 'hex'), 'active'),
  ('c0000000-0000-0000-0000-000000000004', encode(sha256('emily-demo-token'::bytea), 'hex'), 'active'),
  ('c0000000-0000-0000-0000-000000000005', encode(sha256('chris-demo-token'::bytea), 'hex'), 'active'),
  ('c0000000-0000-0000-0000-000000000006', encode(sha256('amanda-demo-token'::bytea), 'hex'), 'active');

-- ============================================
-- 8. Check-ins (30 days of data)
-- ============================================

-- Helper: generate dates
-- We'll insert explicit rows for each client

-- -----------------------------------------------
-- MIKE TORRES — Green status, model client
-- Consistent check-ins, hitting all targets
-- -----------------------------------------------
INSERT INTO checkins (client_id, date, weight_lbs, sleep_hours, sleep_quality, steps, calories, protein_g, carbs_g, fat_g, training_done, training_type, rpe, cardio_minutes, general_notes) VALUES
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 1,  195.2, 7.5, 8, 11200, 2820, 215, 310, 85, true, 'Push (Chest/Shoulders/Tri)', 8, 20, 'Solid session, hit PR on bench 275x3'),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 2,  195.4, 8.0, 9, 10800, 2780, 212, 300, 82, true, 'Pull (Back/Biceps)', 7, 25, 'Good pump, focused on mind-muscle'),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 3,  195.8, 7.0, 7, 12100, 2850, 218, 320, 80, false, NULL, NULL, 30, 'Rest day, extra cardio'),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 4,  195.6, 7.5, 8, 10500, 2790, 210, 305, 84, true, 'Legs (Quad focus)', 9, 15, 'Heavy squats 405x5, legs smoked'),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 5,  196.0, 8.0, 8, 11000, 2810, 220, 290, 86, true, 'Push (Chest/Shoulders/Tri)', 7, 20, NULL),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 6,  195.4, 7.5, 7, 10200, 2760, 208, 310, 78, true, 'Pull (Back/Biceps)', 8, 25, NULL),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 7,  196.2, 8.5, 9, 9800,  2830, 215, 315, 82, false, NULL, NULL, 35, 'Active recovery day'),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 8,  196.0, 7.0, 7, 11500, 2800, 212, 300, 85, true, 'Legs (Hamstring/Glute)', 8, 15, NULL),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 9,  196.4, 7.5, 8, 10700, 2770, 208, 295, 83, true, 'Push', 7, 20, NULL),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 10, 196.2, 8.0, 8, 11300, 2840, 218, 310, 84, true, 'Pull', 8, 20, NULL),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 11, 196.6, 7.5, 7, 10000, 2790, 210, 305, 82, false, NULL, NULL, 30, NULL),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 12, 196.8, 7.0, 7, 10900, 2810, 214, 300, 85, true, 'Legs', 9, 15, NULL),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 13, 196.4, 8.0, 8, 11100, 2780, 211, 310, 80, true, 'Push', 7, 20, NULL),
  ('c0000000-0000-0000-0000-000000000001', CURRENT_DATE - 14, 197.0, 7.5, 8, 10600, 2820, 216, 305, 83, true, 'Pull', 8, 25, NULL);

-- -----------------------------------------------
-- SARAH CHEN — Yellow status
-- Missed 2 days, steps below target
-- -----------------------------------------------
INSERT INTO checkins (client_id, date, weight_lbs, sleep_hours, sleep_quality, steps, calories, protein_g, carbs_g, fat_g, training_done, training_type, rpe, cardio_minutes, general_notes) VALUES
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 1,  142.0, 6.5, 6, 5200,  1750, 125, 195, 55, true, 'Upper Body', 6, 10, 'Feeling tired, low energy'),
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 2,  142.2, 7.0, 7, 6100,  1820, 132, 200, 58, false, NULL, NULL, 15, 'Skipped gym, long day at work'),
  -- skipped day 3
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 4,  141.8, 6.0, 5, 4800,  1680, 118, 190, 52, true, 'Lower Body', 7, 10, NULL),
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 5,  142.4, 7.5, 7, 7200,  1800, 128, 205, 56, true, 'Upper Body', 7, 20, 'Better day'),
  -- skipped day 6
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 7,  142.0, 7.0, 7, 6500,  1790, 130, 200, 55, true, 'Full Body', 6, 15, NULL),
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 8,  142.6, 6.5, 6, 5800,  1760, 122, 195, 58, false, NULL, NULL, 10, NULL),
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 9,  142.2, 7.0, 7, 7000,  1810, 131, 198, 56, true, 'Upper Body', 7, 20, NULL),
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 10, 142.8, 7.5, 8, 6800,  1780, 126, 200, 54, true, 'Lower Body', 7, 15, NULL),
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 11, 142.4, 6.5, 6, 5500,  1720, 120, 192, 53, true, 'Upper Body', 6, 10, NULL),
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 12, 142.0, 7.0, 7, 6200,  1830, 135, 202, 57, false, NULL, NULL, 20, NULL),
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 13, 143.0, 7.5, 7, 7100,  1790, 128, 198, 55, true, 'Full Body', 7, 15, NULL),
  ('c0000000-0000-0000-0000-000000000002', CURRENT_DATE - 14, 142.6, 7.0, 7, 6400,  1800, 130, 200, 56, true, 'Upper Body', 6, 10, NULL);

-- -----------------------------------------------
-- JAKE MORRISON — Red status
-- No check-in in 4 days, sleep crash
-- -----------------------------------------------
INSERT INTO checkins (client_id, date, weight_lbs, sleep_hours, sleep_quality, steps, calories, protein_g, carbs_g, fat_g, training_done, training_type, rpe, cardio_minutes, general_notes) VALUES
  -- No check-ins for days 1-4 (triggers missed_checkin red flag)
  ('c0000000-0000-0000-0000-000000000003', CURRENT_DATE - 5,  228.0, 4.5, 3, 3200,  3500, 200, 400, 120, false, NULL, NULL, 0, 'Terrible sleep, stress from work'),
  ('c0000000-0000-0000-0000-000000000003', CURRENT_DATE - 6,  227.5, 5.0, 4, 4100,  3400, 220, 380, 110, true, 'Chest/Back', 5, 0, 'No energy, cut session short'),
  ('c0000000-0000-0000-0000-000000000003', CURRENT_DATE - 7,  228.2, 5.5, 4, 3800,  3600, 210, 410, 115, false, NULL, NULL, 0, NULL),
  ('c0000000-0000-0000-0000-000000000003', CURRENT_DATE - 8,  227.8, 4.0, 2, 2900,  3300, 195, 370, 105, false, NULL, NULL, 0, 'Insomnia bad this week'),
  ('c0000000-0000-0000-0000-000000000003', CURRENT_DATE - 9,  228.4, 5.0, 3, 3500,  3450, 205, 390, 118, true, 'Legs', 4, 0, NULL),
  ('c0000000-0000-0000-0000-000000000003', CURRENT_DATE - 10, 228.0, 5.5, 5, 4500,  3200, 230, 350, 100, true, 'Arms', 6, 10, NULL),
  ('c0000000-0000-0000-0000-000000000003', CURRENT_DATE - 11, 227.2, 6.0, 5, 5200,  3300, 235, 360, 108, true, 'Push', 7, 15, 'Slightly better sleep'),
  ('c0000000-0000-0000-0000-000000000003', CURRENT_DATE - 12, 227.6, 4.5, 3, 3100,  3500, 198, 400, 122, false, NULL, NULL, 0, NULL),
  ('c0000000-0000-0000-0000-000000000003', CURRENT_DATE - 13, 228.0, 5.0, 4, 3800,  3400, 215, 385, 112, true, 'Pull', 5, 0, NULL),
  ('c0000000-0000-0000-0000-000000000003', CURRENT_DATE - 14, 227.0, 5.5, 4, 4200,  3350, 225, 370, 105, true, 'Legs', 6, 10, NULL);

-- -----------------------------------------------
-- EMILY RODRIGUEZ — Green status
-- Great adherence, weight trending down nicely
-- -----------------------------------------------
INSERT INTO checkins (client_id, date, weight_lbs, sleep_hours, sleep_quality, steps, calories, protein_g, carbs_g, fat_g, training_done, training_type, rpe, cardio_minutes, general_notes) VALUES
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 1,  148.2, 8.0, 9, 12500, 2020, 148, 225, 62, true, 'Glutes/Hamstrings', 8, 30, 'Feeling strong, hip thrusts 225x8'),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 2,  148.6, 7.5, 8, 11800, 1980, 145, 220, 60, true, 'Upper Body', 7, 25, NULL),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 3,  148.0, 8.0, 8, 13200, 2010, 150, 222, 61, false, NULL, NULL, 45, 'Long walk + yoga'),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 4,  149.0, 7.0, 7, 10500, 1990, 142, 228, 63, true, 'Quads/Calves', 8, 20, NULL),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 5,  148.4, 8.5, 9, 11200, 2030, 148, 230, 60, true, 'Push', 7, 25, NULL),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 6,  148.8, 7.5, 8, 10800, 1970, 144, 218, 62, true, 'Pull', 7, 20, NULL),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 7,  149.2, 8.0, 8, 12000, 2000, 146, 225, 61, false, NULL, NULL, 40, 'Active recovery'),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 8,  149.4, 7.5, 7, 11500, 2010, 150, 220, 63, true, 'Glutes/Hamstrings', 8, 30, NULL),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 9,  149.8, 8.0, 8, 10900, 1990, 145, 225, 60, true, 'Upper Body', 7, 25, NULL),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 10, 150.0, 7.5, 8, 12200, 2020, 148, 222, 62, true, 'Quads', 8, 20, NULL),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 11, 149.6, 8.0, 9, 11000, 1980, 146, 218, 61, false, NULL, NULL, 35, NULL),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 12, 150.2, 7.0, 7, 10600, 2010, 150, 225, 63, true, 'Push', 7, 20, NULL),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 13, 150.4, 7.5, 8, 11800, 2000, 147, 220, 62, true, 'Pull', 8, 25, NULL),
  ('c0000000-0000-0000-0000-000000000004', CURRENT_DATE - 14, 150.8, 8.0, 8, 12100, 1990, 144, 228, 60, true, 'Glutes', 8, 30, 'Great week overall');

-- -----------------------------------------------
-- CHRIS BLACKWELL — Yellow status (Wendy's client)
-- Weight stall (14 days, <0.5 lb change), side effects
-- -----------------------------------------------
INSERT INTO checkins (client_id, date, weight_lbs, sleep_hours, sleep_quality, steps, calories, protein_g, carbs_g, fat_g, training_done, training_type, rpe, cardio_minutes, ped_log_json, side_effects_notes, general_notes) VALUES
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 1,  210.2, 7.0, 7, 7500, 2480, 195, 280, 78, true, 'Push', 7, 15, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', 'Mild acne on shoulders', NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 2,  210.4, 7.5, 7, 8200, 2520, 200, 285, 80, true, 'Pull', 7, 20, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 3,  210.0, 6.5, 6, 7800, 2460, 192, 278, 76, false, NULL, NULL, 25, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, 'Rest day'),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 4,  210.6, 7.0, 7, 8000, 2500, 198, 282, 79, true, 'Legs', 8, 15, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', 'Some water retention', NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 5,  210.2, 7.5, 7, 7600, 2490, 196, 280, 78, true, 'Push', 7, 20, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 6,  210.4, 7.0, 6, 7200, 2510, 200, 284, 80, true, 'Pull', 7, 15, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 7,  210.0, 7.5, 7, 8500, 2470, 194, 276, 77, false, NULL, NULL, 30, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 8,  210.6, 7.0, 7, 7800, 2500, 198, 280, 79, true, 'Legs', 8, 15, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', 'Mild acne', NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 9,  210.2, 6.5, 6, 7400, 2480, 195, 278, 78, true, 'Push', 7, 20, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 10, 210.4, 7.0, 7, 8000, 2520, 200, 282, 80, true, 'Pull', 7, 15, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 11, 210.0, 7.5, 7, 7600, 2460, 192, 276, 76, false, NULL, NULL, 25, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 12, 210.2, 7.0, 7, 7800, 2500, 198, 280, 78, true, 'Chest/Shoulders', 7, 20, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 13, 210.4, 6.5, 6, 8200, 2490, 196, 284, 79, true, 'Back/Biceps', 8, 15, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, NULL),
  ('c0000000-0000-0000-0000-000000000005', CURRENT_DATE - 14, 210.0, 7.0, 7, 7500, 2510, 200, 278, 80, true, 'Legs', 8, 15, '[{"compound":"Test Cyp","dose":"200mg","frequency":"weekly"}]', NULL, 'Starting to plateau');

-- -----------------------------------------------
-- AMANDA FOSTER — Red status (Wendy's client)
-- Very low adherence, missed many check-ins
-- -----------------------------------------------
INSERT INTO checkins (client_id, date, weight_lbs, sleep_hours, sleep_quality, steps, calories, protein_g, carbs_g, fat_g, training_done, training_type, rpe, cardio_minutes, general_notes) VALUES
  -- Only 5 check-ins in 14 days (very low adherence)
  ('c0000000-0000-0000-0000-000000000006', CURRENT_DATE - 2,  168.4, 5.5, 4, 3200, 2200, 80, 280, 90, false, NULL, NULL, 0, 'Rough week, eating out a lot'),
  ('c0000000-0000-0000-0000-000000000006', CURRENT_DATE - 5,  169.0, 6.0, 5, 4100, 2100, 90, 260, 82, true, 'Full Body', 4, 0, 'Tried to get back on track'),
  ('c0000000-0000-0000-0000-000000000006', CURRENT_DATE - 8,  168.8, 5.0, 3, 2800, 2300, 75, 300, 95, false, NULL, NULL, 0, 'Stressed, not sleeping well'),
  ('c0000000-0000-0000-0000-000000000006', CURRENT_DATE - 11, 169.2, 6.5, 5, 3500, 1900, 95, 240, 70, true, 'Upper Body', 5, 10, NULL),
  ('c0000000-0000-0000-0000-000000000006', CURRENT_DATE - 14, 168.0, 6.0, 5, 4000, 2000, 85, 250, 78, false, NULL, NULL, 0, 'Starting fresh this week');

-- ============================================
-- 9. Flags
-- ============================================

-- Jake: missed check-in (red) + sleep crash (red)
INSERT INTO flags (client_id, flag_type, severity, details) VALUES
  ('c0000000-0000-0000-0000-000000000003', 'missed_checkin', 'red', '{"days_since_checkin": 5, "last_checkin": "4 days ago"}'::jsonb),
  ('c0000000-0000-0000-0000-000000000003', 'sleep_crash', 'red', '{"avg_sleep_7d": 4.9, "threshold": 6.0}'::jsonb);

-- Sarah: steps below target (yellow)
INSERT INTO flags (client_id, flag_type, severity, details) VALUES
  ('c0000000-0000-0000-0000-000000000002', 'steps_low', 'yellow', '{"avg_steps_7d": 5943, "target": 8000}'::jsonb);

-- Chris: weight stall (yellow) + side effects (yellow)
INSERT INTO flags (client_id, flag_type, severity, details) VALUES
  ('c0000000-0000-0000-0000-000000000005', 'weight_stall', 'yellow', '{"weight_delta_14d": 0.2, "threshold": 0.5}'::jsonb),
  ('c0000000-0000-0000-0000-000000000005', 'side_effects', 'yellow', '{"note": "Mild acne on shoulders, some water retention"}'::jsonb);

-- Amanda: missed check-in (red)
INSERT INTO flags (client_id, flag_type, severity, details) VALUES
  ('c0000000-0000-0000-0000-000000000006', 'missed_checkin', 'red', '{"days_since_checkin": 2, "adherence_7d": 0.29}'::jsonb);

-- ============================================
-- 10. Coach Notes
-- ============================================
INSERT INTO coach_notes (client_id, coach_user_id, note, action_items, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Mike is crushing it. All metrics green. Discussed moving to a slight surplus for the next 4 weeks to take advantage of his strength gains.',
   '["Increase calories by 200", "Add extra set on compounds", "Recheck body comp in 2 weeks"]'::jsonb,
   CURRENT_DATE - 3),

  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'Sarah mentioned work stress is affecting her consistency. Discussed simplifying her training split to 3x/week to reduce decision fatigue. Steps are the main concern.',
   '["Simplify to 3x/week full body", "Set daily step alarm", "Check in via text mid-week"]'::jsonb,
   CURRENT_DATE - 2),

  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'Jake has gone dark — no check-ins in 5 days. Sleep was already crashing before he stopped logging. Need to reach out ASAP. Possible burnout or personal issues.',
   '["Text Jake today", "Suggest deload week", "Discuss sleep hygiene protocol", "Consider melatonin or magnesium"]'::jsonb,
   CURRENT_DATE - 1),

  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'Emily is progressing beautifully. Weight trending down ~0.4lb/week which is perfect for her goals. Adherence is near 100%. She asked about adding a glute specialization block.',
   '["Program glute specialization block", "Maintain current calorie target", "Add hip thrust progression"]'::jsonb,
   CURRENT_DATE - 4),

  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002',
   'Chris has been consistent but weight is totally stalled at 210. Training is good but we may need to adjust calories. Also reporting mild acne and water retention on TRT — may need to discuss with his doc about AI.',
   '["Drop calories by 150", "Add 10 min cardio to training days", "Suggest bloodwork for E2 levels", "Monitor acne"]'::jsonb,
   CURRENT_DATE - 2),

  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002',
   'Amanda is struggling. Only 5 check-ins in the last 2 weeks. When she does log, protein is way under target and she is eating out frequently. Need a heart-to-heart about her goals and whether the current plan is realistic.',
   '["Schedule call with Amanda", "Simplify meal plan to 3 meals", "Set minimum viable targets", "Consider reducing check-in frequency to reduce pressure"]'::jsonb,
   CURRENT_DATE - 1);

-- ============================================
-- 11. Client Metrics (pre-computed for dashboard)
-- ============================================
INSERT INTO client_metrics (
  client_id, coach_user_id, last_checkin_at,
  adherence_7d, avg_calories_7d, avg_protein_7d, avg_steps_7d, avg_sleep_7d,
  weight_current, weight_delta_7d, weight_delta_30d,
  status, open_flags_count
) VALUES
  -- Mike Torres: Green, model client
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   (CURRENT_DATE - 1)::timestamptz,
   1.0, 2806, 214, 10800, 7.7,
   195.2, -1.0, -1.8,
   'green', 0),

  -- Sarah Chen: Yellow, missed days + low steps
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   (CURRENT_DATE - 1)::timestamptz,
   0.71, 1769, 126, 5943, 6.8,
   142.0, -0.0, -1.0,
   'yellow', 1),

  -- Jake Morrison: Red, no recent check-in + sleep crash
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   (CURRENT_DATE - 5)::timestamptz,
   0.43, 3407, 214, 3729, 4.9,
   228.0, 1.0, 1.0,
   'red', 2),

  -- Emily Rodriguez: Green, great adherence
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   (CURRENT_DATE - 1)::timestamptz,
   1.0, 2004, 146, 11714, 7.8,
   148.2, -1.0, -2.6,
   'green', 0),

  -- Chris Blackwell: Yellow, weight stall + side effects
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002',
   (CURRENT_DATE - 1)::timestamptz,
   1.0, 2491, 196, 7757, 7.1,
   210.2, 0.2, 0.2,
   'yellow', 2),

  -- Amanda Foster: Red, low adherence
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002',
   (CURRENT_DATE - 2)::timestamptz,
   0.29, 2150, 85, 3300, 5.5,
   168.4, -0.6, 0.4,
   'red', 1);
