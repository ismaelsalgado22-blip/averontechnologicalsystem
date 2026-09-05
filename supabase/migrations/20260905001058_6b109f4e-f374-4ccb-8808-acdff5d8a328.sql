-- 1) owner_id em todas as tabelas de dados
DO $$
DECLARE
  t text;
  first_user uuid;
  nulls bigint;
  tables text[] := ARRAY['clients','equipment','services','products','budgets','budget_items',
    'work_orders','work_order_items','technical_reports','warranties','appointments','payments',
    'inventory_movements','documents','activity_logs','company_settings'];
BEGIN
  SELECT id INTO first_user FROM auth.users ORDER BY created_at LIMIT 1;
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid()', t);
    IF first_user IS NOT NULL THEN
      EXECUTE format('UPDATE public.%I SET owner_id = %L WHERE owner_id IS NULL', t, first_user);
    END IF;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE owner_id IS NULL', t) INTO nulls;
    IF nulls = 0 THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN owner_id SET NOT NULL', t);
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (owner_id)', 'idx_' || t || '_owner', t);
  END LOOP;
END $$;

-- 2) políticas: substitui acesso global por acesso por dono
DROP POLICY IF EXISTS clients_all ON public.clients;
CREATE POLICY clients_own ON public.clients FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS equipment_all ON public.equipment;
CREATE POLICY equipment_own ON public.equipment FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS services_all ON public.services;
CREATE POLICY services_own ON public.services FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS products_all ON public.products;
CREATE POLICY products_own ON public.products FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS budgets_all ON public.budgets;
CREATE POLICY budgets_own ON public.budgets FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS budget_items_all ON public.budget_items;
CREATE POLICY budget_items_own ON public.budget_items FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS wo_all ON public.work_orders;
CREATE POLICY wo_own ON public.work_orders FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS wo_items_all ON public.work_order_items;
CREATE POLICY wo_items_own ON public.work_order_items FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS reports_all ON public.technical_reports;
CREATE POLICY reports_own ON public.technical_reports FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS warranties_all ON public.warranties;
CREATE POLICY warranties_own ON public.warranties FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS appointments_all ON public.appointments;
CREATE POLICY appointments_own ON public.appointments FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS payments_all ON public.payments;
CREATE POLICY payments_own ON public.payments FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS moves_all ON public.inventory_movements;
CREATE POLICY moves_own ON public.inventory_movements FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS documents_all ON public.documents;
CREATE POLICY documents_own ON public.documents FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS logs_read ON public.activity_logs;
DROP POLICY IF EXISTS logs_insert ON public.activity_logs;
CREATE POLICY logs_read_own ON public.activity_logs FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY logs_insert_own ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS settings_read ON public.company_settings;
DROP POLICY IF EXISTS settings_write ON public.company_settings;
CREATE POLICY settings_own ON public.company_settings FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS roles_read ON public.user_roles;
CREATE POLICY roles_read_own ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3) numeração de documentos por conta
ALTER TABLE public.doc_counters ADD COLUMN IF NOT EXISTS owner_id uuid;
DO $$
DECLARE first_user uuid;
BEGIN
  SELECT id INTO first_user FROM auth.users ORDER BY created_at LIMIT 1;
  IF first_user IS NOT NULL THEN
    UPDATE public.doc_counters SET owner_id = first_user WHERE owner_id IS NULL;
  ELSE
    DELETE FROM public.doc_counters WHERE owner_id IS NULL;
  END IF;
END $$;
ALTER TABLE public.doc_counters ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.doc_counters DROP CONSTRAINT IF EXISTS doc_counters_pkey;
ALTER TABLE public.doc_counters ADD PRIMARY KEY (owner_id, prefix, year);

CREATE OR REPLACE FUNCTION public.next_doc_number(p_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE y INT := EXTRACT(YEAR FROM now())::INT; v INT; o uuid := auth.uid();
BEGIN
  INSERT INTO public.doc_counters (owner_id, prefix, year, last_value) VALUES (o, p_prefix, y, 1)
  ON CONFLICT (owner_id, prefix, year) DO UPDATE SET last_value = public.doc_counters.last_value + 1
  RETURNING last_value INTO v;
  RETURN p_prefix || '-' || y::TEXT || '-' || lpad(v::TEXT, 4, '0');
END; $function$;

-- 4) baixa de estoque mantém o dono
CREATE OR REPLACE FUNCTION public.consume_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products SET stock = stock - NEW.quantity
      WHERE id = NEW.product_id AND owner_id = NEW.owner_id;
    INSERT INTO public.inventory_movements (product_id, quantity, kind, reason, work_order_id, owner_id)
    VALUES (NEW.product_id, NEW.quantity, 'saida', 'Uso em OS', NEW.work_order_id, NEW.owner_id);
  END IF;
  RETURN NEW;
END; $function$;

-- 5) quem se cadastra é administrador da própria conta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'administrador'::public.app_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;