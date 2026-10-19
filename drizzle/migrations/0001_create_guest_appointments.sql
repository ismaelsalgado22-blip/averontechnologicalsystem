CREATE TABLE public.guest_appointments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contact_name text NOT NULL CHECK (length(btrim(contact_name)) > 0),
 contact_phone text NOT NULL CHECK (length(btrim(contact_phone)) > 0),
 title text NOT NULL DEFAULT 'Visita técnica',
 technician_name text,
 scheduled_at timestamptz NOT NULL DEFAULT now(),
 duration_minutes integer NOT NULL DEFAULT 60,
 address text,
 status text NOT NULL DEFAULT 'agendado',
 notes text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 owner_id uuid NOT NULL DEFAULT auth.uid()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_appointments TO authenticated;
GRANT ALL ON public.guest_appointments TO service_role;
ALTER TABLE public.guest_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_appointments_own ON public.guest_appointments FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX guest_appointments_owner_schedule_idx ON public.guest_appointments(owner_id, scheduled_at);
CREATE TRIGGER guest_appointments_updated_at BEFORE UPDATE ON public.guest_appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();