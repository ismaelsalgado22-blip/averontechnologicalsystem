-- ENUMS
CREATE TYPE public.app_role AS ENUM ('administrador','tecnico','administrativo');
CREATE TYPE public.client_kind AS ENUM ('pf','pj');
CREATE TYPE public.budget_status AS ENUM ('rascunho','enviado','aguardando_aprovacao','aprovado','recusado','expirado','cancelado');
CREATE TYPE public.wo_status AS ENUM ('aberta','agendada','em_execucao','aguardando_peca','aguardando_aprovacao','concluida','cancelada');
CREATE TYPE public.payment_status AS ENUM ('pendente','pago','vencido','cancelado');
CREATE TYPE public.payment_method AS ENUM ('pix','dinheiro','cartao','transferencia','boleto','parcelado');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  is_technician BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_read" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cnt INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  SELECT count(*) INTO cnt FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN cnt = 0 THEN 'administrador'::public.app_role ELSE 'administrativo'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'MEC Frio Refrigeração',
  tagline TEXT NOT NULL DEFAULT 'Manutenção • Instalação • Refrigeração',
  cnpj TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  instagram TEXT,
  logo_url TEXT,
  bank_details TEXT,
  warranty_terms TEXT,
  payment_conditions TEXT,
  default_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_write" ON public.company_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrador')) WITH CHECK (public.has_role(auth.uid(),'administrador'));
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.client_kind NOT NULL DEFAULT 'pf',
  name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT,
  state_registration TEXT,
  contact_person TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  zip_code TEXT,
  address TEXT,
  number TEXT,
  complement TEXT,
  district TEXT,
  city TEXT,
  state TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_all" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  asset_tag TEXT,
  capacity TEXT,
  voltage TEXT,
  refrigerant TEXT,
  refrigerant_amount TEXT,
  compressor TEXT,
  install_location TEXT,
  install_date DATE,
  condition TEXT,
  notes TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipment_all" ON public.equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_equipment_updated BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Manutenção corretiva',
  description TEXT,
  labor_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  estimated_time TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_all" ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'un',
  stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_all" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL,
  kind TEXT NOT NULL DEFAULT 'saida',
  reason TEXT,
  work_order_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_movements TO authenticated;
GRANT ALL ON public.inventory_movements TO service_role;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moves_all" ON public.inventory_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.doc_counters (
  prefix TEXT NOT NULL,
  year INT NOT NULL,
  last_value INT NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, year)
);
GRANT SELECT ON public.doc_counters TO authenticated;
GRANT ALL ON public.doc_counters TO service_role;
ALTER TABLE public.doc_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counters_read" ON public.doc_counters FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.next_doc_number(p_prefix TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE y INT := EXTRACT(YEAR FROM now())::INT; v INT;
BEGIN
  INSERT INTO public.doc_counters (prefix, year, last_value) VALUES (p_prefix, y, 1)
  ON CONFLICT (prefix, year) DO UPDATE SET last_value = public.doc_counters.last_value + 1
  RETURNING last_value INTO v;
  RETURN p_prefix || '-' || y::TEXT || '-' || lpad(v::TEXT, 4, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.set_doc_number() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = '' THEN
    NEW.number := public.next_doc_number(TG_ARGV[0]);
  END IF;
  RETURN NEW;
END; $$;

CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  problem_description TEXT,
  status public.budget_status NOT NULL DEFAULT 'rascunho',
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  travel_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  labor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  items_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_conditions TEXT,
  deadline TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT ON public.budgets TO anon;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budgets_all" ON public.budgets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budgets_public_link" ON public.budgets FOR SELECT TO anon USING (status <> 'rascunho');
CREATE TRIGGER trg_budgets_updated BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_budgets_number BEFORE INSERT ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.set_doc_number('ORC');

CREATE TABLE public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'servico',
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_items TO authenticated;
GRANT SELECT ON public.budget_items TO anon;
GRANT ALL ON public.budget_items TO service_role;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_items_all" ON public.budget_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "budget_items_public" ON public.budget_items FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.budgets b WHERE b.id = budget_id AND b.status <> 'rascunho'));

CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  technician_id UUID,
  technician_name TEXT,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_time TEXT,
  service_type TEXT,
  reported_problem TEXT,
  diagnosis TEXT,
  executed_service TEXT,
  refrigerant TEXT,
  refrigerant_amount TEXT,
  pressures TEXT,
  compressor_current TEXT,
  temperatures TEXT,
  tests TEXT,
  notes TEXT,
  status public.wo_status NOT NULL DEFAULT 'aberta',
  photos_before TEXT[] NOT NULL DEFAULT '{}',
  photos_during TEXT[] NOT NULL DEFAULT '{}',
  photos_after TEXT[] NOT NULL DEFAULT '{}',
  signature TEXT,
  signed_at TIMESTAMPTZ,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;
GRANT ALL ON public.work_orders TO service_role;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_all" ON public.work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_wo_updated BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_wo_number BEFORE INSERT ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.set_doc_number('OS');

CREATE TABLE public.work_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'peca',
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_order_items TO authenticated;
GRANT ALL ON public.work_order_items TO service_role;
ALTER TABLE public.work_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wo_items_all" ON public.work_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_stock() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
    INSERT INTO public.inventory_movements (product_id, quantity, kind, reason, work_order_id)
    VALUES (NEW.product_id, NEW.quantity, 'saida', 'Uso em OS', NEW.work_order_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_wo_items_stock AFTER INSERT ON public.work_order_items FOR EACH ROW EXECUTE FUNCTION public.consume_stock();

CREATE TABLE public.technical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT,
  technician_name TEXT,
  general_condition TEXT,
  compressor TEXT,
  condenser TEXT,
  evaporator TEXT,
  fans TEXT,
  controller TEXT,
  sensors TEXT,
  thermostat TEXT,
  electrical_system TEXT,
  piping TEXT,
  insulation TEXT,
  drain TEXT,
  defrost_system TEXT,
  refrigerant_leak TEXT,
  pressures TEXT,
  temperatures TEXT,
  current_reading TEXT,
  voltage TEXT,
  refrigerant_state TEXT,
  diagnosis TEXT,
  probable_cause TEXT,
  recommendation TEXT,
  recommended_service TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_reports TO authenticated;
GRANT ALL ON public.technical_reports TO service_role;
ALTER TABLE public.technical_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_all" ON public.technical_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.technical_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reports_number BEFORE INSERT ON public.technical_reports FOR EACH ROW EXECUTE FUNCTION public.set_doc_number('LAUDO');

CREATE TABLE public.warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  service_performed TEXT,
  parts_used TEXT,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days INT NOT NULL DEFAULT 90,
  end_date DATE,
  conditions TEXT,
  exclusions TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warranties TO authenticated;
GRANT SELECT ON public.warranties TO anon;
GRANT ALL ON public.warranties TO service_role;
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "warranties_all" ON public.warranties FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "warranties_public_validate" ON public.warranties FOR SELECT TO anon USING (true);
CREATE TRIGGER trg_warranties_updated BEFORE UPDATE ON public.warranties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_warranties_number BEFORE INSERT ON public.warranties FOR EACH ROW EXECUTE FUNCTION public.set_doc_number('GAR');

CREATE OR REPLACE FUNCTION public.set_warranty_end() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.end_date := NEW.start_date + (NEW.days || ' days')::interval;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_warranty_end BEFORE INSERT OR UPDATE ON public.warranties FOR EACH ROW EXECUTE FUNCTION public.set_warranty_end();

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  technician_name TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_minutes INT NOT NULL DEFAULT 60,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'agendado',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_all" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
  budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_at DATE,
  method public.payment_method NOT NULL DEFAULT 'pix',
  installments INT NOT NULL DEFAULT 1,
  status public.payment_status NOT NULL DEFAULT 'pendente',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_all" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_all" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  detail TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_read" ON public.activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "logs_insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_equipment_client ON public.equipment(client_id);
CREATE INDEX idx_budgets_client ON public.budgets(client_id);
CREATE INDEX idx_wo_client ON public.work_orders(client_id);
CREATE INDEX idx_reports_client ON public.technical_reports(client_id);
CREATE INDEX idx_warranties_client ON public.warranties(client_id);
CREATE INDEX idx_payments_client ON public.payments(client_id);
CREATE INDEX idx_logs_client ON public.activity_logs(client_id);