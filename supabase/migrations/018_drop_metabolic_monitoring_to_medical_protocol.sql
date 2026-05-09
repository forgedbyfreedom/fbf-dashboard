-- Bug fix: sync_delivered_program_to_client was writing
-- generated_programs.metabolic_monitoring (a temp/sleep tracking object —
-- e.g. {daily_temp, track_daily, check_in}) into clients.medical_protocol
-- (which is supposed to be the PED/peptide protocol array
-- [{name, dose, frequency, notes}] per ProgramEditor's contract).
--
-- The schemas don't match, so coaches saw garbage in the Medical Protocol
-- section of the dashboard, and any manual coach edits to medical_protocol
-- were silently overwritten by every program (re)delivery.
--
-- Fix:
--   1. Remove the medical_protocol assignment from the trigger entirely.
--      Coaches set medical_protocol manually via ProgramEditor.
--   2. Reset the 5 client rows whose medical_protocol is currently the
--      wrong-shape object: clear to '[]'::jsonb so coaches can repopulate.

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
       AND OLD.training_program IS NOT DISTINCT FROM NEW.training_program
       AND OLD.nutrition_plan   IS NOT DISTINCT FROM NEW.nutrition_plan
       AND OLD.cardio_protocol  IS NOT DISTINCT FROM NEW.cardio_protocol
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

  -- Sync to clients (with shape normalization for the array-shape RN app contract).
  -- medical_protocol is intentionally NOT touched here: coaches set it manually
  -- via ProgramEditor. Previously it was incorrectly assigned from
  -- NEW.metabolic_monitoring, which is a different schema (temp/sleep tracking).
  UPDATE public.clients
  SET
    workout_program  = public.normalize_workout_program_jsonb(NEW.training_program),
    meal_plan        = COALESCE(public.normalize_meal_plan_jsonb(NEW.nutrition_plan), meal_plan),
    cardio_protocol  = COALESCE(public.normalize_cardio_protocol_jsonb(NEW.cardio_protocol), cardio_protocol)
  WHERE LOWER(email) = LOWER(NEW.client_email);

  RETURN NEW;
END;
$function$;


-- Cleanup: reset 5 client rows whose medical_protocol was corrupted by the prior
-- trigger's wrong assignment. They contain metabolic_monitoring objects, not PED arrays.
UPDATE public.clients
SET medical_protocol = '[]'::jsonb
WHERE jsonb_typeof(medical_protocol) = 'object'
  AND id IN (
    '3ce105a5-55fb-4401-a100-9959892ce68f',  -- Frank Kelley
    '8c695519-7e72-40f3-9fa8-228b91d4f2e5',  -- Jim Weldon
    'c9192507-345e-4cba-9d3a-2216d0666354',  -- John Such
    'd664ef77-7859-4b33-991e-756d39f9ef39',  -- Michelle Roger
    '673c1285-fc45-4958-a60d-1382742b3da0'   -- Teresa Weldon
  );
