ALTER TABLE public.appointments ADD COLUMN reported_problem TEXT;
ALTER TABLE public.guest_appointments ADD COLUMN reported_problem TEXT;

UPDATE public.appointments AS a
SET reported_problem = wo.reported_problem
FROM public.work_orders AS wo
WHERE a.work_order_id = wo.id
  AND a.reported_problem IS NULL;

CREATE OR REPLACE FUNCTION public.sync_work_order_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_at timestamptz;
  v_title text;
BEGIN
  IF NEW.status <> 'agendada' THEN RETURN NEW; END IF;
  v_at := ((NEW.service_date::text || ' ' || COALESCE(NULLIF(NEW.service_time, ''), '09:00'))::timestamp AT TIME ZONE 'America/Sao_Paulo');
  v_title := concat_ws(' • ', COALESCE(NEW.number, 'Ordem de serviço'), NULLIF(NEW.service_type, ''));
  IF EXISTS (SELECT 1 FROM public.appointments WHERE work_order_id = NEW.id) THEN
    UPDATE public.appointments SET client_id = NEW.client_id, equipment_id = NEW.equipment_id,
      title = v_title, technician_name = NEW.technician_name, scheduled_at = v_at,
      notes = NEW.reported_problem, reported_problem = NEW.reported_problem
    WHERE work_order_id = NEW.id;
  ELSE
    INSERT INTO public.appointments (client_id, equipment_id, work_order_id, title, technician_name, scheduled_at, notes, reported_problem, status, duration_minutes, owner_id)
    VALUES (NEW.client_id, NEW.equipment_id, NEW.id, v_title, NEW.technician_name, v_at, NEW.reported_problem, NEW.reported_problem, 'agendado', 60, NEW.owner_id);
  END IF;
  RETURN NEW;
END
$function$;