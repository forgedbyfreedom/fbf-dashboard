-- Normalize AI-generated program shapes on the way to clients table.
--
-- Problem: forged-by-freedom's AI program generators (generateProgramFromApplication,
-- generateProgram in index.js) emit object-shape JSONB:
--   training_program = {schedule, progression, deload, days: {dayName: [...]}, ...}
--   nutrition_plan   = {daily_calories, ..., meal_plan: [...], training_day_sample: {...}}
--   cardio_protocol  = {daily, active_rest_day, notes} (v1) or {type, weekly_sessions, ...} (v2)
--
-- The fbf-client-app (RN) reads clients.workout_program / meal_plan / cardio_protocol
-- and expects canonical array shape:
--   workout_program = [{day, exercises: [{name, sets, reps, rest?, notes?}]}]
--   meal_plan       = [{day, meals: [{id, type, name, ingredients, calories, ...}]}]
--   cardio_protocol = [{phase, duration, notes?}]
--
-- The sync_delivered_program_to_client trigger was passing the object shape
-- straight through to clients.*, breaking the RN app for every client whose
-- program came from the AI generators (Array.isArray guard returned false →
-- empty workout view + SAMPLE_MEAL_PLAN fallback).
--
-- This migration:
--   1. Adds three pure normalize_*_jsonb helper functions (arrays pass through,
--      object shapes get flattened to canonical array; per-exercise tempo/rir
--      preserved by packing into notes).
--   2. Replaces sync_delivered_program_to_client to call the normalizers
--      on every future delivery.
--   3. Backfills the 6 affected client rows in place.
--
-- generated_programs is intentionally untouched: formatProgramHTML in
-- forged-by-freedom/index.js iterates training_program.days as an object
-- (Object.entries) for the email rendering, and the dashboard's review UI
-- depends on the rich object shape too. Only the client-facing columns
-- get normalized.
--
-- Companion to fbf-client-app/lib/normalize-plan.ts which provides the same
-- transformation in TypeScript as defense-in-depth on read.

-- ─── Helper: workout_program object → canonical array ────────────────────────
create or replace function public.normalize_workout_program_jsonb(p_input jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_days        jsonb;
  v_result      jsonb := '[]'::jsonb;
  v_day         record;
  v_exercises   jsonb;
  v_ex          jsonb;
  v_norm_ex     jsonb;
  v_notes_parts text[];
  v_notes       text;
  v_name        text;
begin
  if p_input is null then return null; end if;
  if jsonb_typeof(p_input) = 'array' then return p_input; end if;
  if jsonb_typeof(p_input) <> 'object' then return '[]'::jsonb; end if;

  v_days := p_input->'days';
  if v_days is null then return '[]'::jsonb; end if;
  if jsonb_typeof(v_days) = 'array' then return v_days; end if;
  if jsonb_typeof(v_days) <> 'object' then return '[]'::jsonb; end if;

  for v_day in select * from jsonb_each(v_days) loop
    v_exercises := '[]'::jsonb;

    if jsonb_typeof(v_day.value) = 'array' then
      for v_ex in select value from jsonb_array_elements(v_day.value) loop
        if jsonb_typeof(v_ex) <> 'object' then continue; end if;

        v_name := coalesce(nullif(v_ex->>'name', ''), nullif(v_ex->>'exercise', ''));
        if v_name is null then continue; end if;

        v_notes_parts := array[]::text[];
        if nullif(v_ex->>'tempo', '') is not null then
          v_notes_parts := v_notes_parts || ('Tempo ' || (v_ex->>'tempo'));
        end if;
        if v_ex ? 'rir' and v_ex->'rir' is not null and jsonb_typeof(v_ex->'rir') <> 'null' then
          v_notes_parts := v_notes_parts || ('RIR ' || (v_ex->>'rir'));
        end if;
        if nullif(v_ex->>'notes', '') is not null then
          v_notes_parts := v_notes_parts || (v_ex->>'notes');
        end if;
        v_notes := nullif(array_to_string(v_notes_parts, ' • '), '');

        v_norm_ex := jsonb_build_object(
          'name', v_name,
          'sets', coalesce(v_ex->'sets', '""'::jsonb),
          'reps', coalesce(v_ex->>'reps', '')
        );
        if nullif(v_ex->>'rest', '') is not null then
          v_norm_ex := v_norm_ex || jsonb_build_object('rest', v_ex->>'rest');
        end if;
        if v_notes is not null then
          v_norm_ex := v_norm_ex || jsonb_build_object('notes', v_notes);
        end if;

        v_exercises := v_exercises || jsonb_build_array(v_norm_ex);
      end loop;
    end if;

    if jsonb_array_length(v_exercises) > 0 then
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'day', v_day.key,
        'exercises', v_exercises
      ));
    end if;
  end loop;

  return v_result;
end;
$$;


-- ─── Helper: meal_plan object → canonical array ──────────────────────────────
-- Handles v1 (nested `meal_plan` array) and v2 (`training_day_sample` object).
create or replace function public.normalize_meal_plan_jsonb(p_input jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_inner       jsonb;
  v_meals       jsonb := '[]'::jsonb;
  v_meal        jsonb;
  v_idx         int := 0;
  v_label       text;
  v_meal_type   text;
  v_ingredients jsonb;
  v_food        jsonb;
  v_norm_meal   jsonb;
  v_sample      jsonb;
  v_entry       record;
begin
  if p_input is null then return null; end if;
  if jsonb_typeof(p_input) = 'array' then return p_input; end if;
  if jsonb_typeof(p_input) <> 'object' then return '[]'::jsonb; end if;

  v_inner := p_input->'meal_plan';
  if jsonb_typeof(v_inner) = 'array' then
    for v_meal in select value from jsonb_array_elements(v_inner) loop
      if jsonb_typeof(v_meal) <> 'object' then continue; end if;

      v_label := coalesce(v_meal->>'meal', v_meal->>'type', '');
      if lower(v_label) like '%breakfast%' then v_meal_type := 'breakfast';
      elsif lower(v_label) like '%lunch%' then v_meal_type := 'lunch';
      elsif lower(v_label) like '%dinner%' then v_meal_type := 'dinner';
      else v_meal_type := 'snack';
      end if;

      v_ingredients := '[]'::jsonb;
      if jsonb_typeof(v_meal->'foods') = 'array' then
        for v_food in select value from jsonb_array_elements(v_meal->'foods') loop
          v_ingredients := v_ingredients || jsonb_build_array(jsonb_build_object(
            'name', case when jsonb_typeof(v_food) = 'string' then (v_food#>>'{}') else v_food::text end,
            'quantity', '',
            'unit', '',
            'category', 'other',
            'checked', false
          ));
        end loop;
      end if;

      v_norm_meal := jsonb_build_object(
        'id', 'daily-' || v_idx,
        'type', v_meal_type,
        'name', coalesce(nullif(v_meal->>'name', ''), nullif(v_label, ''), 'Meal ' || (v_idx + 1)),
        'ingredients', v_ingredients,
        'calories', v_meal->'calories',
        'protein_g', v_meal->'protein_g',
        'carbs_g', v_meal->'carbs_g',
        'fat_g', v_meal->'fat_g',
        'recipe_url', null,
        'image_url', null
      );
      v_meals := v_meals || jsonb_build_array(v_norm_meal);
      v_idx := v_idx + 1;
    end loop;

    if jsonb_array_length(v_meals) > 0 then
      return jsonb_build_array(jsonb_build_object('day', 'Daily', 'meals', v_meals));
    end if;
  end if;

  -- v2: training_day_sample object {meal_1, meal_2, ...}
  v_sample := p_input->'training_day_sample';
  if jsonb_typeof(v_sample) = 'object' then
    v_idx := 0;
    for v_entry in select * from jsonb_each(v_sample) loop
      if jsonb_typeof(v_entry.value) <> 'object' then continue; end if;
      if nullif(v_entry.value->>'description', '') is null then continue; end if;

      v_label := v_entry.key;
      if v_idx = 0 then v_meal_type := 'breakfast';
      elsif v_idx = 1 then v_meal_type := 'lunch';
      elsif v_idx >= 3 then v_meal_type := 'dinner';
      else v_meal_type := 'snack';
      end if;

      v_norm_meal := jsonb_build_object(
        'id', 'daily-' || v_idx,
        'type', v_meal_type,
        'name', case
                  when nullif(v_entry.value->>'time', '') is not null
                  then v_label || ' (' || (v_entry.value->>'time') || ')'
                  else v_label
                end,
        'ingredients', jsonb_build_array(jsonb_build_object(
          'name', v_entry.value->>'description',
          'quantity', '',
          'unit', '',
          'category', 'other',
          'checked', false
        )),
        'calories', null,
        'protein_g', null,
        'carbs_g', null,
        'fat_g', null,
        'recipe_url', null,
        'image_url', null
      );
      v_meals := v_meals || jsonb_build_array(v_norm_meal);
      v_idx := v_idx + 1;
    end loop;

    if jsonb_array_length(v_meals) > 0 then
      return jsonb_build_array(jsonb_build_object('day', 'Daily', 'meals', v_meals));
    end if;
  end if;

  return '[]'::jsonb;
end;
$$;


-- ─── Helper: cardio_protocol object → canonical array ────────────────────────
-- Handles v1 ({daily, active_rest_day, notes}) and v2 ({type, weekly_sessions, step_goal, ...}).
create or replace function public.normalize_cardio_protocol_jsonb(p_input jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_result      jsonb := '[]'::jsonb;
  v_daily       text;
  v_active_rest text;
  v_notes       text;
  v_type        text;
  v_timing      text;
  v_step_goal   text;
  v_hr_zone     text;
  v_weekly      text;
  v_v2_notes    text[];
  v_v2_combined text;
begin
  if p_input is null then return null; end if;
  if jsonb_typeof(p_input) = 'array' then return p_input; end if;
  if jsonb_typeof(p_input) <> 'object' then return '[]'::jsonb; end if;

  -- v1 shape
  v_daily       := nullif(p_input->>'daily', '');
  v_active_rest := nullif(p_input->>'active_rest_day', '');
  v_notes       := nullif(p_input->>'notes', '');

  if v_daily is not null then
    if v_notes is not null then
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'phase', 'Daily', 'duration', v_daily, 'notes', v_notes
      ));
    else
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'phase', 'Daily', 'duration', v_daily
      ));
    end if;
  end if;
  if v_active_rest is not null then
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'phase', 'Active Rest', 'duration', v_active_rest
    ));
  end if;
  if jsonb_array_length(v_result) > 0 then
    return v_result;
  end if;

  -- v2 shape fallback
  v_type      := nullif(p_input->>'type', '');
  v_timing    := nullif(p_input->>'timing', '');
  v_step_goal := nullif(p_input->>'step_goal', '');
  v_hr_zone   := nullif(p_input->>'heart_rate_zone', '');
  v_weekly    := nullif(p_input->>'weekly_sessions', '');

  if v_type is not null or v_timing is not null or v_weekly is not null then
    v_v2_notes := array[]::text[];
    if v_timing is not null    then v_v2_notes := v_v2_notes || ('Timing: ' || v_timing); end if;
    if v_step_goal is not null then v_v2_notes := v_v2_notes || ('Step goal: ' || v_step_goal); end if;
    if v_hr_zone is not null   then v_v2_notes := v_v2_notes || ('HR zone: ' || v_hr_zone); end if;
    if v_notes is not null     then v_v2_notes := v_v2_notes || v_notes; end if;
    v_v2_combined := nullif(array_to_string(v_v2_notes, ' • '), '');

    v_result := jsonb_build_array(jsonb_build_object(
      'phase', coalesce(v_type, 'Cardio'),
      'duration', case when v_weekly is not null then v_weekly || 'x per week' else 'See notes' end
    ));
    if v_v2_combined is not null then
      v_result := jsonb_build_array((v_result->0) || jsonb_build_object('notes', v_v2_combined));
    end if;
  end if;

  return v_result;
end;
$$;


comment on function public.normalize_workout_program_jsonb(jsonb) is
  'Convert AI-generated object-shape workout program ({days: {dayName: [...]}}) to canonical [{day, exercises}] array. Arrays pass through. Per-exercise tempo/rir packed into notes.';
comment on function public.normalize_meal_plan_jsonb(jsonb) is
  'Convert AI-generated object-shape nutrition_plan to canonical [{day, meals}] array. Handles v1 nested meal_plan and v2 training_day_sample.';
comment on function public.normalize_cardio_protocol_jsonb(jsonb) is
  'Convert AI-generated object-shape cardio_protocol to canonical [{phase, duration, notes?}] array. Handles v1 (daily/active_rest_day) and v2 (type/weekly_sessions).';


-- ─── Replace trigger to normalize on write ───────────────────────────────────
-- See migration 018 for the medical_protocol fix that supersedes this version.
CREATE OR REPLACE FUNCTION public.sync_delivered_program_to_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_review_approved boolean;
  v_actor_id        text;
  v_actor_name      text;
BEGIN
  BEGIN
    v_actor_id := current_setting('app.actor_id', true);
  EXCEPTION WHEN OTHERS THEN v_actor_id := NULL; END;
  IF v_actor_id IS NULL OR v_actor_id = '' THEN
    v_actor_id := COALESCE(auth.uid()::text, 'role:' || current_user);
  END IF;

  BEGIN
    v_actor_name := current_setting('app.actor_name', true);
  EXCEPTION WHEN OTHERS THEN v_actor_name := NULL; END;

  IF NEW.status IS DISTINCT FROM 'delivered' THEN RETURN NEW; END IF;
  IF NEW.training_program IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'delivered'
       AND OLD.training_program     IS NOT DISTINCT FROM NEW.training_program
       AND OLD.nutrition_plan       IS NOT DISTINCT FROM NEW.nutrition_plan
       AND OLD.cardio_protocol      IS NOT DISTINCT FROM NEW.cardio_protocol
       AND OLD.metabolic_monitoring IS NOT DISTINCT FROM NEW.metabolic_monitoring
    THEN RETURN NEW; END IF;
  END IF;

  IF NEW.approved_at IS NULL THEN
    INSERT INTO public.reconciliation_findings (finding_type, severity, program_id, details)
    VALUES (
      'program_delivered_no_approval', 'critical', NEW.id,
      jsonb_build_object(
        'message',     'Program marked delivered but approved_at is NULL; sync to clients suppressed',
        'client_email', NEW.client_email, 'actor_id', v_actor_id, 'actor_name', v_actor_name, 'tg_op', TG_OP
      )
    );
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.program_reviews pr
    WHERE pr.intake_id = NEW.intake_id AND pr.status = 'approved' AND pr.approved_at IS NOT NULL
  ) INTO v_review_approved;

  IF NOT v_review_approved THEN
    INSERT INTO public.reconciliation_findings (finding_type, severity, program_id, details)
    VALUES (
      'program_delivered_no_review', 'critical', NEW.id,
      jsonb_build_object(
        'message', 'Program marked delivered but no approved program_reviews row found for intake_id',
        'intake_id', NEW.intake_id, 'client_email', NEW.client_email,
        'actor_id', v_actor_id, 'actor_name', v_actor_name, 'tg_op', TG_OP
      )
    );
    RETURN NEW;
  END IF;

  UPDATE public.clients
  SET
    workout_program  = public.normalize_workout_program_jsonb(NEW.training_program),
    meal_plan        = COALESCE(public.normalize_meal_plan_jsonb(NEW.nutrition_plan), meal_plan),
    cardio_protocol  = COALESCE(public.normalize_cardio_protocol_jsonb(NEW.cardio_protocol), cardio_protocol),
    medical_protocol = COALESCE(NEW.metabolic_monitoring, medical_protocol)
  WHERE LOWER(email) = LOWER(NEW.client_email);

  RETURN NEW;
END;
$function$;


-- ─── Backfill the 6 affected clients in place ────────────────────────────────
UPDATE public.clients
SET
  workout_program = public.normalize_workout_program_jsonb(workout_program),
  meal_plan       = public.normalize_meal_plan_jsonb(meal_plan),
  cardio_protocol = public.normalize_cardio_protocol_jsonb(cardio_protocol)
WHERE id IN (
  '7b9889f9-eb27-4f66-853e-0cea59bc3aba',  -- Graham Warren
  'c9192507-345e-4cba-9d3a-2216d0666354',  -- John Such
  'd664ef77-7859-4b33-991e-756d39f9ef39',  -- Michelle Roger
  '3ce105a5-55fb-4401-a100-9959892ce68f',  -- Frank Kelley
  '8c695519-7e72-40f3-9fa8-228b91d4f2e5',  -- Jim Weldon
  '673c1285-fc45-4958-a60d-1382742b3da0'   -- Teresa Weldon
);
