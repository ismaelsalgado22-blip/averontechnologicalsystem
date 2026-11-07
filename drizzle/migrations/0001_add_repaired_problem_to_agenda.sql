ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS repaired_problem text;
ALTER TABLE public.guest_appointments ADD COLUMN IF NOT EXISTS repaired_problem text;