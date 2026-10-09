ALTER TABLE public.work_orders ADD COLUMN other_tests TEXT;
COMMENT ON COLUMN public.work_orders.other_tests IS 'Campo livre "Outros testes" da seção Medições técnicas';