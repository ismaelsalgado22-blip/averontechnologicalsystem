CREATE OR REPLACE FUNCTION public.sync_work_order_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_at timestamptz;
  v_title text;
BEGIN
  IF NEW.status <> 'agendada' THEN RETURN NEW; END IF;
  v_at := ((NEW.service_date::text || ' ' || COALESCE(NULLIF(NEW.service_time, ''), '09:00'))::timestamp AT TIME ZONE 'America/Sao_Paulo');
  v_title := concat_ws(' • ', COALESCE('OS ' || NEW.number, 'Ordem de serviço'), NULLIF(NEW.service_type, ''));
  IF EXISTS (SELECT 1 FROM public.appointments WHERE work_order_id = NEW.id) THEN
    UPDATE public.appointments SET client_id = NEW.client_id, equipment_id = NEW.equipment_id,
      title = v_title, technician_name = NEW.technician_name, scheduled_at = v_at, notes = NEW.reported_problem
    WHERE work_order_id = NEW.id;
  ELSE
    INSERT INTO public.appointments (client_id, equipment_id, work_order_id, title, technician_name, scheduled_at, notes, status, duration_minutes, owner_id)
    VALUES (NEW.client_id, NEW.equipment_id, NEW.id, v_title, NEW.technician_name, v_at, NEW.reported_problem, 'agendado', 60, NEW.owner_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_work_order_appointment ON public.work_orders;
CREATE TRIGGER trg_sync_work_order_appointment
AFTER INSERT OR UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_work_order_appointment();

INSERT INTO public.appointments (client_id, equipment_id, work_order_id, title, technician_name, scheduled_at, notes, status, duration_minutes, owner_id)
SELECT w.client_id, w.equipment_id, w.id,
  concat_ws(' • ', COALESCE('OS ' || w.number, 'Ordem de serviço'), NULLIF(w.service_type, '')),
  w.technician_name,
  ((w.service_date::text || ' ' || COALESCE(NULLIF(w.service_time, ''), '09:00'))::timestamp AT TIME ZONE 'America/Sao_Paulo'),
  w.reported_problem, 'agendado', 60, w.owner_id
FROM public.work_orders w
WHERE w.status = 'agendada' AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.work_order_id = w.id);