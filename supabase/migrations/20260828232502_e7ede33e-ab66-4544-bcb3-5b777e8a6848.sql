INSERT INTO public.company_settings (id, name, tagline, cnpj, phone, whatsapp, email, address, city, state, instagram, bank_details, warranty_terms, payment_conditions, default_notes)
VALUES ('11111111-1111-1111-1111-111111111111','MEC Frio Refrigeração','Manutenção • Instalação • Refrigeração','12.345.678/0001-90','(11) 4002-8922','5511999998888','contato@mecfrio.com.br','Av. das Indústrias, 1200 - Galpão 4','São Paulo','SP','@mecfrio','PIX: contato@mecfrio.com.br | Banco 001 Ag 1234 CC 56789-0','Garantia de 90 dias sobre o serviço executado e peças substituídas, contados da data de conclusão do serviço. Não cobre mau uso, oscilação de energia, sobrecarga, avarias por terceiros ou falta de limpeza periódica.','50% na aprovação e 50% na conclusão. Aceitamos Pix, dinheiro, cartão e transferência.','Equipamento testado e em funcionamento na conclusão do serviço.');

INSERT INTO public.services (name, category, description, labor_price, estimated_time) VALUES
('Carga de gás R134a','Carga de fluido refrigerante','Vácuo, teste de estanqueidade e carga completa de fluido',380.00,'2h'),
('Troca de compressor - geladeira expositora','Compressores','Substituição de compressor com filtro secador e carga de gás',950.00,'4h'),
('Reparo de vazamento com solda','Solda','Localização e solda de vazamento na tubulação',420.00,'3h'),
('Manutenção preventiva câmara fria','Câmaras frias','Limpeza de condensador, evaporador, checagem elétrica e pressões',560.00,'3h'),
('Manutenção preventiva ar-condicionado split','Ar-condicionado','Higienização completa, limpeza de dreno e checagem de gás',280.00,'1h30'),
('Instalação de chopeira','Chopeiras','Instalação, regulagem de pressão e teste de temperatura',450.00,'3h'),
('Troca de controlador digital','Controladores','Substituição e parametrização do controlador',320.00,'1h30'),
('Reparo elétrico - relé e protetor térmico','Elétrica','Substituição de componentes de partida do compressor',260.00,'1h'),
('Manutenção corretiva freezer horizontal','Freezers','Diagnóstico e correção de falha de refrigeração',390.00,'2h'),
('Instalação de câmara fria','Instalação','Montagem, tubulação, elétrica e start-up',2800.00,'2 dias');

INSERT INTO public.products (name, code, category, unit, stock, min_stock, cost, price, supplier) VALUES
('Compressor 1/3 HP R134a','CMP-133','Compressores','un',4,2,420.00,780.00,'Refripeças Distribuidora'),
('Compressor 1/2 HP R404a','CMP-1250','Compressores','un',2,1,690.00,1180.00,'Refripeças Distribuidora'),
('Capacitor de partida 100uF','CAP-100','Capacitores','un',18,6,22.00,55.00,'Elétrica Fria'),
('Relé PTC universal','REL-PTC','Relés','un',15,5,18.00,45.00,'Elétrica Fria'),
('Protetor térmico 1/3 HP','PRT-133','Protetores térmicos','un',12,4,26.00,60.00,'Elétrica Fria'),
('Controlador digital TC-900','CTR-900','Controladores','un',6,2,180.00,340.00,'Full Gauge'),
('Sensor NTC 2m','SEN-NTC2','Sensores','un',24,8,14.00,38.00,'Full Gauge'),
('Filtro secador 15g','FLT-15','Filtros secadores','un',30,10,9.00,28.00,'Refripeças Distribuidora'),
('Fluido refrigerante R134a 13,6kg','GAS-134','Fluido refrigerante','kg',22,6,58.00,110.00,'Gases do Brasil'),
('Fluido refrigerante R404a 10,9kg','GAS-404','Fluido refrigerante','kg',11,5,95.00,175.00,'Gases do Brasil'),
('Tubo de cobre 3/8 (barra 5m)','TBC-38','Tubos de cobre','un',8,3,120.00,220.00,'Cobre Center'),
('Fita isolante alta fusão','MAT-FIF','Materiais diversos','un',20,5,12.00,30.00,'Casa do Refrigerista');

INSERT INTO public.clients (id, kind, name, document, phone, whatsapp, email, zip_code, address, number, district, city, state, notes) VALUES
('22222222-2222-2222-2222-222222222222','pf','João da Silva','123.456.789-00','(11) 3333-4444','5511988887777','joao.silva@email.com','03110-000','Rua das Palmeiras','450','Vila Prudente','São Paulo','SP','Cliente antigo, atende melhor pela manhã.');

INSERT INTO public.clients (id, kind, name, trade_name, document, state_registration, contact_person, phone, whatsapp, email, zip_code, address, number, district, city, state, notes) VALUES
('33333333-3333-3333-3333-333333333333','pj','Mercado Bom Preço Ltda','Mercado Bom Preço','98.765.432/0001-11','123.456.789.000','Carla Mendes','(11) 2222-1111','5511977776666','compras@bompreco.com.br','04120-000','Av. Central','1750','Saúde','São Paulo','SP','Manutenção preventiva mensal contratada.');

INSERT INTO public.equipment (id, client_id, type, brand, model, serial_number, asset_tag, capacity, voltage, refrigerant, refrigerant_amount, compressor, install_location, install_date, condition) VALUES
('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222','Geladeira Expositora','Metalfrio','VB40RE','MTF-2021-88123','PAT-001','400L','220V','R134a','230g','1/4 HP Embraco','Salão principal','2022-03-14','Bom'),
('44444444-4444-4444-4444-444444444445','22222222-2222-2222-2222-222222222222','Freezer','Electrolux','H400','ELX-77451','PAT-002','385L','127V','R134a','180g','1/5 HP','Cozinha','2021-08-02','Regular'),
('55555555-5555-5555-5555-555555555551','33333333-3333-3333-3333-333333333333','Câmara Fria','Danfoss','CF-2000','DNF-CF-4412','PAT-101','12m³','220V trifásico','R404a','4,5kg','2 HP Bitzer','Estoque refrigerado','2020-11-20','Bom'),
('55555555-5555-5555-5555-555555555552','33333333-3333-3333-3333-333333333333','Chopeira','Beertek','BT-2T','BTK-9932','PAT-102','2 torres','220V','R134a','320g','1/3 HP','Setor de bebidas','2023-05-10','Ótimo'),
('55555555-5555-5555-5555-555555555553','33333333-3333-3333-3333-333333333333','Ar-condicionado','LG','Dual Inverter 18000','LG-AC-55120','PAT-103','18.000 BTUs','220V','R410a','1,2kg','Inverter','Escritório','2022-09-01','Bom');

INSERT INTO public.budgets (id, number, client_id, equipment_id, issue_date, valid_until, problem_description, status, discount, travel_fee, labor_total, items_total, total, payment_conditions, deadline, notes) VALUES
('66666666-6666-6666-6666-666666666661','ORC-2026-0001','22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444', CURRENT_DATE - 6, CURRENT_DATE + 4,'Expositora não gela, compressor liga e desarma.','aprovado',50.00,80.00,950.00,808.00,1788.00,'50% na aprovação e 50% na conclusão.','3 dias úteis','Equipamento retirado para bancada.'),
('66666666-6666-6666-6666-666666666662','ORC-2026-0002','33333333-3333-3333-3333-333333333333','55555555-5555-5555-5555-555555555551', CURRENT_DATE - 3, CURRENT_DATE + 12,'Câmara fria com formação excessiva de gelo no evaporador.','enviado',0,120.00,560.00,166.00,846.00,'À vista via Pix.','2 dias úteis',NULL),
('66666666-6666-6666-6666-666666666663','ORC-2026-0003','33333333-3333-3333-3333-333333333333','55555555-5555-5555-5555-555555555553', CURRENT_DATE - 20, CURRENT_DATE - 5,'Split do escritório com baixa refrigeração.','recusado',0,0,280.00,110.00,390.00,'À vista.','1 dia',NULL);

INSERT INTO public.budget_items (budget_id, kind, description, quantity, unit_price, total) VALUES
('66666666-6666-6666-6666-666666666661','servico','Troca de compressor - geladeira expositora',1,950.00,950.00),
('66666666-6666-6666-6666-666666666661','peca','Compressor 1/3 HP R134a',1,780.00,780.00),
('66666666-6666-6666-6666-666666666661','peca','Filtro secador 15g',1,28.00,28.00),
('66666666-6666-6666-6666-666666666662','servico','Manutenção preventiva câmara fria',1,560.00,560.00),
('66666666-6666-6666-6666-666666666662','peca','Sensor NTC 2m',1,38.00,38.00),
('66666666-6666-6666-6666-666666666662','peca','Controlador digital TC-900',0,0,0),
('66666666-6666-6666-6666-666666666662','material','Fluido refrigerante R404a',1,128.00,128.00),
('66666666-6666-6666-6666-666666666663','servico','Manutenção preventiva ar-condicionado split',1,280.00,280.00),
('66666666-6666-6666-6666-666666666663','material','Fluido refrigerante R134a',1,110.00,110.00);

INSERT INTO public.work_orders (id, number, client_id, equipment_id, budget_id, technician_name, service_date, service_time, service_type, reported_problem, diagnosis, executed_service, refrigerant, refrigerant_amount, pressures, compressor_current, temperatures, tests, status, total, signed_at, notes) VALUES
('77777777-7777-7777-7777-777777777771','OS-2026-0001','22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444','66666666-6666-6666-6666-666666666661','Marcos Ferreira', CURRENT_DATE - 4,'09:00','Manutenção corretiva','Expositora não gela e compressor desarma.','Compressor com enrolamento em curto e filtro secador saturado.','Substituição do compressor 1/3 HP, troca do filtro secador, vácuo e carga de gás R134a.','R134a','230g','BP 8 psi / AP 145 psi','1,8 A','Evaporador -8°C / Ambiente interno 3°C','Teste de estanqueidade, corrente e ciclo de degelo aprovados.','concluida',1788.00, now() - interval '4 days','Cliente orientado sobre limpeza periódica do condensador.'),
('77777777-7777-7777-7777-777777777772','OS-2026-0002','33333333-3333-3333-3333-333333333333','55555555-5555-5555-5555-555555555551',NULL,'Marcos Ferreira', CURRENT_DATE + 2,'14:00','Manutenção preventiva','Formação de gelo no evaporador da câmara fria.',NULL,NULL,'R404a',NULL,NULL,NULL,NULL,NULL,'agendada',846.00,NULL,NULL),
('77777777-7777-7777-7777-777777777773','OS-2026-0003','33333333-3333-3333-3333-333333333333','55555555-5555-5555-5555-555555555552',NULL,'Rafael Souza', CURRENT_DATE,'10:30','Manutenção corretiva','Chopeira com chope saindo quente.','Pressão de gás desregulada e condensador sujo.',NULL,'R134a','320g','BP 12 psi','1,1 A','Serpentina 2°C',NULL,'em_execucao',0,NULL,NULL);

INSERT INTO public.work_order_items (work_order_id, kind, description, quantity, unit_price, total) VALUES
('77777777-7777-7777-7777-777777777771','peca','Compressor 1/3 HP R134a',1,780.00,780.00),
('77777777-7777-7777-7777-777777777771','peca','Filtro secador 15g',1,28.00,28.00),
('77777777-7777-7777-7777-777777777771','servico','Troca de compressor - geladeira expositora',1,950.00,950.00);

INSERT INTO public.technical_reports (id, number, client_id, equipment_id, work_order_id, inspection_date, location, technician_name, general_condition, compressor, condenser, evaporator, fans, controller, sensors, thermostat, electrical_system, piping, insulation, drain, defrost_system, refrigerant_leak, pressures, temperatures, current_reading, voltage, refrigerant_state, diagnosis, probable_cause, recommendation, recommended_service) VALUES
('88888888-8888-8888-8888-888888888881','LAUDO-2026-0001','22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444','77777777-7777-7777-7777-777777777771', CURRENT_DATE - 5,'Salão principal - Rua das Palmeiras, 450','Marcos Ferreira','Equipamento em estado regular, gabinete conservado','Enrolamento em curto - inoperante','Sujo, com acúmulo de poeira','Sem obstruções, aletas íntegras','Ventilador do condensador operando normalmente','Controlador original funcionando','Sensor de temperatura íntegro','Termostato dentro do parâmetro','Fiação em bom estado, tomada com aterramento','Tubulação sem amassados','Isolamento térmico íntegro','Dreno desobstruído','Degelo automático operante','Não constatado vazamento','BP 0 psi (compressor inoperante)','Interna 22°C (sem refrigeração)','Desarme por proteção térmica','221V','Carga preservada no sistema','Compressor queimado, sistema sem capacidade de refrigeração.','Sobrecarga por condensador obstruído associada a oscilação de tensão.','Substituição do compressor, troca do filtro secador, vácuo e nova carga de gás. Limpeza do condensador a cada 60 dias.','Troca de compressor - geladeira expositora');

INSERT INTO public.warranties (id, number, client_id, equipment_id, work_order_id, service_performed, parts_used, service_date, start_date, days, conditions, exclusions) VALUES
('99999999-9999-9999-9999-999999999991','GAR-2026-0001','22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444444','77777777-7777-7777-7777-777777777771','Troca de compressor, filtro secador e carga de gás R134a','Compressor 1/3 HP R134a, Filtro secador 15g', CURRENT_DATE - 4, CURRENT_DATE - 4, 90,'Garantia de 90 dias sobre o serviço executado e peças substituídas.','Não cobre mau uso, oscilação de energia, sobrecarga da rede elétrica, avarias causadas por terceiros ou falta de limpeza periódica.'),
('99999999-9999-9999-9999-999999999992','GAR-2026-0002','33333333-3333-3333-3333-333333333333','55555555-5555-5555-5555-555555555552',NULL,'Instalação e regulagem de chopeira','Sensor NTC 2m', CURRENT_DATE - 75, CURRENT_DATE - 75, 90,'Garantia de 90 dias sobre a instalação.','Não cobre mau uso ou remoção do equipamento por terceiros.');

INSERT INTO public.appointments (client_id, equipment_id, work_order_id, title, technician_name, scheduled_at, duration_minutes, address, status) VALUES
('33333333-3333-3333-3333-333333333333','55555555-5555-5555-5555-555555555551','77777777-7777-7777-7777-777777777772','Manutenção preventiva câmara fria','Marcos Ferreira', (CURRENT_DATE + 2) + time '14:00', 180,'Av. Central, 1750 - Saúde, São Paulo/SP','agendado'),
('22222222-2222-2222-2222-222222222222','44444444-4444-4444-4444-444444444445',NULL,'Avaliação de freezer','Rafael Souza', (CURRENT_DATE + 1) + time '09:30', 60,'Rua das Palmeiras, 450 - Vila Prudente','agendado'),
('33333333-3333-3333-3333-333333333333','55555555-5555-5555-5555-555555555552','77777777-7777-7777-7777-777777777773','Correção de chopeira','Rafael Souza', CURRENT_DATE + time '10:30', 90,'Av. Central, 1750 - Saúde, São Paulo/SP','em_andamento');

INSERT INTO public.payments (client_id, work_order_id, budget_id, description, amount, due_date, paid_at, method, status) VALUES
('22222222-2222-2222-2222-222222222222','77777777-7777-7777-7777-777777777771','66666666-6666-6666-6666-666666666661','Entrada OS-2026-0001',894.00, CURRENT_DATE - 6, CURRENT_DATE - 6,'pix','pago'),
('22222222-2222-2222-2222-222222222222','77777777-7777-7777-7777-777777777771','66666666-6666-6666-6666-666666666661','Saldo final OS-2026-0001',894.00, CURRENT_DATE + 5, NULL,'pix','pendente'),
('33333333-3333-3333-3333-333333333333','77777777-7777-7777-7777-777777777773',NULL,'Serviço chopeira',450.00, CURRENT_DATE - 10, NULL,'boleto','vencido');

INSERT INTO public.activity_logs (client_id, entity, entity_id, action, detail, created_at) VALUES
('22222222-2222-2222-2222-222222222222','client','22222222-2222-2222-2222-222222222222','Cliente cadastrado','João da Silva', now() - interval '8 days'),
('22222222-2222-2222-2222-222222222222','budget','66666666-6666-6666-6666-666666666661','Orçamento criado','ORC-2026-0001', now() - interval '6 days'),
('22222222-2222-2222-2222-222222222222','budget','66666666-6666-6666-6666-666666666661','Orçamento aprovado','ORC-2026-0001', now() - interval '5 days'),
('22222222-2222-2222-2222-222222222222','report','88888888-8888-8888-8888-888888888881','Laudo técnico emitido','LAUDO-2026-0001', now() - interval '5 days'),
('22222222-2222-2222-2222-222222222222','work_order','77777777-7777-7777-7777-777777777771','OS criada','OS-2026-0001', now() - interval '4 days'),
('22222222-2222-2222-2222-222222222222','work_order','77777777-7777-7777-7777-777777777771','Serviço concluído','OS-2026-0001', now() - interval '4 days'),
('22222222-2222-2222-2222-222222222222','warranty','99999999-9999-9999-9999-999999999991','Garantia emitida','GAR-2026-0001 - 90 dias', now() - interval '4 days'),
('33333333-3333-3333-3333-333333333333','client','33333333-3333-3333-3333-333333333333','Cliente cadastrado','Mercado Bom Preço Ltda', now() - interval '30 days'),
('33333333-3333-3333-3333-333333333333','budget','66666666-6666-6666-6666-666666666662','Orçamento enviado','ORC-2026-0002', now() - interval '3 days');