CREATE OR REPLACE FUNCTION public.subscription_is_active() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=auth.uid() AND status='ativa' AND (active_until IS NULL OR active_until >= (now() AT TIME ZONE 'America/Sao_Paulo')::date)); $$;
REVOKE ALL ON FUNCTION public.subscription_is_active() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.subscription_is_active() TO authenticated;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['clients','equipment','budgets','budget_items','work_orders','work_order_items','technical_reports','warranties','appointments','guest_appointments','services','products','inventory_movements','payments','documents','company_settings','activity_logs','doc_counters'] LOOP EXECUTE format('CREATE POLICY subscription_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.subscription_is_active()) WITH CHECK (public.subscription_is_active())',t); END LOOP; END $$;
ALTER POLICY counters_read ON public.doc_counters USING (owner_id=auth.uid());
DROP POLICY budgets_public_link ON public.budgets;
DROP POLICY budget_items_public ON public.budget_items;
DROP POLICY warranties_public_validate ON public.warranties;
CREATE OR REPLACE FUNCTION public.validate_warranty(certificate_number text) RETURNS TABLE(number text,service_performed text,service_date date,start_date date,end_date date,days integer,conditions text,exclusions text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT w.number,w.service_performed,w.service_date,w.start_date,w.end_date,w.days,w.conditions,w.exclusions FROM public.warranties w WHERE w.number=upper(trim(certificate_number)) LIMIT 1; $$;
REVOKE ALL ON FUNCTION public.validate_warranty(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.validate_warranty(text) TO anon,authenticated;
ALTER POLICY mecfrio_read ON storage.objects USING (bucket_id='mecfrio' AND owner_id=auth.uid()::text AND public.subscription_is_active());
ALTER POLICY mecfrio_insert ON storage.objects WITH CHECK (bucket_id='mecfrio' AND (storage.foldername(name))[1]=auth.uid()::text AND public.subscription_is_active());
ALTER POLICY mecfrio_update ON storage.objects USING (bucket_id='mecfrio' AND owner_id=auth.uid()::text AND public.subscription_is_active()) WITH CHECK (bucket_id='mecfrio' AND owner_id=auth.uid()::text AND public.subscription_is_active());
ALTER POLICY mecfrio_delete ON storage.objects USING (bucket_id='mecfrio' AND owner_id=auth.uid()::text AND public.subscription_is_active());
CREATE POLICY settings_admin_required ON public.company_settings AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'administrador'));
CREATE POLICY settings_admin_update ON public.company_settings AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'administrador')) WITH CHECK (public.has_role(auth.uid(),'administrador'));
CREATE POLICY settings_admin_delete ON public.company_settings AS RESTRICTIVE FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'administrador'));
CREATE TABLE public.notification_preferences(user_id uuid PRIMARY KEY DEFAULT auth.uid(), settings jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE ON public.notification_preferences TO authenticated; GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY preferences_own ON public.notification_preferences FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL DEFAULT auth.uid(),event text NOT NULL,title text NOT NULL,body text NOT NULL DEFAULT '',module text NOT NULL,entity_id uuid,priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('baixa','normal','alta')),dedupe_key text NOT NULL,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(owner_id,dedupe_key));
GRANT SELECT,UPDATE ON public.notifications TO authenticated; GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_own ON public.notifications FOR ALL TO authenticated USING(owner_id=auth.uid() AND public.subscription_is_active()) WITH CHECK(owner_id=auth.uid() AND public.subscription_is_active());
CREATE INDEX notifications_owner_date ON public.notifications(owner_id,created_at DESC);
CREATE INDEX notifications_owner_unread ON public.notifications(owner_id) WHERE read_at IS NULL;
CREATE OR REPLACE FUNCTION public.record_business_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; previous jsonb; e text; label text; key text; changed boolean; BEGIN
r:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
IF TG_OP='UPDATE' THEN previous:=to_jsonb(OLD); IF (r-'updated_at')=(previous-'updated_at') THEN RETURN NEW; END IF; END IF;
INSERT INTO public.activity_logs(entity,entity_id,action,detail,user_id,owner_id,client_id) VALUES(TG_TABLE_NAME,(r->>'id')::uuid,lower(TG_OP),coalesce(r->>'number',r->>'name',r->>'title',r->>'description',TG_TABLE_NAME),auth.uid(),(r->>'owner_id')::uuid,CASE WHEN TG_OP='DELETE' THEN NULL ELSE nullif(r->>'client_id','')::uuid END);
IF TG_OP='DELETE' THEN RETURN OLD; END IF;
e:=CASE WHEN TG_OP='INSERT' AND TG_TABLE_NAME='clients' THEN 'novo_cliente' WHEN TG_OP='INSERT' AND TG_TABLE_NAME='work_orders' THEN 'nova_ordem' WHEN TG_OP='INSERT' AND TG_TABLE_NAME='budgets' THEN 'novo_orcamento' WHEN TG_TABLE_NAME='budgets' AND r->>'status'='aprovado' THEN 'orcamento_aprovado' WHEN TG_TABLE_NAME='payments' AND r->>'status'='pago' THEN 'pagamento_recebido' WHEN TG_TABLE_NAME IN ('appointments','guest_appointments') THEN 'agenda_atualizada' ELSE 'servico_atualizado' END;
label:=CASE e WHEN 'novo_cliente' THEN 'Novo cliente' WHEN 'nova_ordem' THEN 'Nova ordem de serviço' WHEN 'novo_orcamento' THEN 'Novo orçamento' WHEN 'orcamento_aprovado' THEN 'Orçamento aprovado' WHEN 'pagamento_recebido' THEN 'Pagamento recebido' WHEN 'agenda_atualizada' THEN 'Agenda atualizada' ELSE 'Registro atualizado' END;
key:=TG_TABLE_NAME||':'||(r->>'id')||':'||TG_OP||':'||gen_random_uuid()::text;
INSERT INTO public.notifications(owner_id,event,title,body,module,entity_id,dedupe_key) VALUES((r->>'owner_id')::uuid,e,label,coalesce(r->>'number',r->>'name',r->>'title',r->>'description',''),TG_TABLE_NAME,(r->>'id')::uuid,key);
RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['clients','equipment','budgets','work_orders','technical_reports','warranties','appointments','guest_appointments','services','products','payments'] LOOP EXECUTE format('CREATE TRIGGER notification_business_event AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.record_business_event()',t); END LOOP; END $$;
CREATE OR REPLACE FUNCTION public.refresh_due_notifications() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE uid uuid:=auth.uid(); BEGIN
IF uid IS NULL OR NOT public.subscription_is_active() THEN RAISE EXCEPTION 'Assinatura inativa'; END IF;
INSERT INTO public.notifications(owner_id,event,title,body,module,entity_id,priority,dedupe_key)
SELECT uid,'agenda_proxima','Atendimento próximo',title||' • '||to_char(scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM HH24:MI'),'appointments',id,CASE WHEN scheduled_at<=now()+interval '30 minutes' THEN 'alta' ELSE 'normal' END,'agenda:'||id||':'||scheduled_at::text||CASE WHEN scheduled_at<=now()+interval '30 minutes' THEN ':soon' ELSE ':day' END FROM public.appointments WHERE owner_id=uid AND status IN ('agendado','confirmado') AND scheduled_at BETWEEN now() AND now()+interval '24 hours' ON CONFLICT(owner_id,dedupe_key) DO NOTHING;
INSERT INTO public.notifications(owner_id,event,title,body,module,entity_id,priority,dedupe_key)
SELECT uid,'agenda_proxima','Atendimento próximo',contact_name||' • '||to_char(scheduled_at AT TIME ZONE 'America/Sao_Paulo','DD/MM HH24:MI'),'guest_appointments',id,CASE WHEN scheduled_at<=now()+interval '30 minutes' THEN 'alta' ELSE 'normal' END,'agenda:'||id||':'||scheduled_at::text||CASE WHEN scheduled_at<=now()+interval '30 minutes' THEN ':soon' ELSE ':day' END FROM public.guest_appointments WHERE owner_id=uid AND status IN ('agendado','confirmado') AND scheduled_at BETWEEN now() AND now()+interval '24 hours' ON CONFLICT(owner_id,dedupe_key) DO NOTHING;
INSERT INTO public.notifications(owner_id,event,title,body,module,entity_id,priority,dedupe_key)
SELECT uid,'financeiro_pendente',CASE WHEN due_date<(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN 'Pagamento atrasado' ELSE 'Pagamento vence hoje' END,description,'payments',id,'alta','pay:'||id||':'||due_date FROM public.payments WHERE owner_id=uid AND status='pendente' AND due_date<=(now() AT TIME ZONE 'America/Sao_Paulo')::date ON CONFLICT(owner_id,dedupe_key) DO NOTHING;
INSERT INTO public.notifications(owner_id,event,title,body,module,entity_id,dedupe_key)
SELECT uid,'garantia_vencendo','Garantia a vencer',number||' • '||to_char(end_date,'DD/MM/YYYY'),'warranties',id,'war:'||id||':'||end_date FROM public.warranties WHERE owner_id=uid AND end_date BETWEEN (now() AT TIME ZONE 'America/Sao_Paulo')::date AND (now() AT TIME ZONE 'America/Sao_Paulo')::date+30 ON CONFLICT(owner_id,dedupe_key) DO NOTHING;
INSERT INTO public.notifications(owner_id,event,title,body,module,entity_id,priority,dedupe_key)
SELECT uid,'estoque_baixo','Estoque baixo',name,'products',id,'alta','stock:'||id||':'||updated_at FROM public.products WHERE owner_id=uid AND stock<=min_stock ON CONFLICT(owner_id,dedupe_key) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.refresh_due_notifications() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.refresh_due_notifications() TO authenticated;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;