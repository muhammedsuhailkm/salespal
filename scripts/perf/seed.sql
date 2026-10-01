-- Load-test data for SalesPal (~1 year of activity). Run against an EMPTY database that has the schema pushed:
--   createdb salespal_perf
--   DATABASE_URL="postgresql://USER@localhost:5432/salespal_perf?schema=public" npx prisma db push --skip-generate
--   psql postgresql://USER@localhost:5432/salespal_perf -v pw="$(node -e "console.log(require('bcryptjs').hashSync('password123',10))")" -f scripts/perf/seed.sql
-- Logins (password123): owner@salespal.test, manager.a@salespal.test, omar@salespal.test, accountant@salespal.test
\set ON_ERROR_STOP on
SELECT setseed(0.42);
INSERT INTO roles (id, name) VALUES (1,'Admin'),(2,'Manager'),(3,'Salesman'),(4,'Accountant');
INSERT INTO organizations (name) SELECT 'Company ' || chr(64+g) FROM generate_series(1,4) g;
-- users: 1 owner, 8 managers, 60 salesmen, 3 accountants
INSERT INTO users (name, role_id, email, password, phone) VALUES ('SalesPal Owner',1,'owner@salespal.test',:'pw','+97450000001');
INSERT INTO users (name, role_id, email, password, phone)
  SELECT 'Manager ' || g, 2, CASE WHEN g=1 THEN 'manager.a@salespal.test' ELSE 'manager' || g || '@salespal.test' END, :'pw', '+9745100' || lpad(g::text,4,'0') FROM generate_series(1,8) g;
INSERT INTO users (name, role_id, email, password, phone)
  SELECT 'Salesman ' || g, 3, CASE WHEN g=1 THEN 'omar@salespal.test' ELSE 'salesman' || g || '@salespal.test' END, :'pw', '+9745200' || lpad(g::text,4,'0') FROM generate_series(1,60) g;
INSERT INTO users (name, role_id, email, password, phone)
  SELECT 'Accountant ' || g, 4, CASE WHEN g=1 THEN 'accountant@salespal.test' ELSE 'accountant' || g || '@salespal.test' END, :'pw', '+9745300' || lpad(g::text,4,'0') FROM generate_series(1,3) g;
CREATE TEMP TABLE mgr AS SELECT id, row_number() over (order by id) rn FROM users WHERE role_id=2;
CREATE TEMP TABLE sm AS SELECT id, row_number() over (order by id) rn FROM users WHERE role_id=3;
CREATE TEMP TABLE org AS SELECT id, row_number() over (order by id) rn FROM organizations;
-- managers 1-2 -> org1, 3-4 -> org2 ...
INSERT INTO manager_org (manager_id, org_id) SELECT m.id, o.id FROM mgr m JOIN org o ON o.rn = (m.rn+1)/2;
-- salesmen spread over managers
INSERT INTO manager_salesman (manager_id, salesman_id) SELECT m.id, s.id FROM sm s JOIN mgr m ON m.rn = ((s.rn-1) % 8) + 1;
-- accountant 1 -> orgs 1,2 ; others one org each
INSERT INTO accountant_org (accountant_id, org_id) SELECT a.id, o.id FROM (SELECT id, row_number() over (order by id) rn FROM users WHERE role_id=4) a JOIN org o ON (a.rn=1 AND o.rn IN (1,2)) OR (a.rn>1 AND o.rn=a.rn+1);
-- salesman -> org (via manager)
CREATE TEMP TABLE sm_org AS SELECT s.id sid, s.rn, mo.org_id FROM sm s JOIN manager_salesman ms ON ms.salesman_id=s.id JOIN manager_org mo ON mo.manager_id=ms.manager_id;
-- 30k clients
INSERT INTO clients (name, contact_person_name, contact_no, cr_no, mail_id, assigned_salesman_id, org_id, status, created_at)
SELECT 'Client ' || g, 'Contact ' || g, '+9744' || lpad(g::text,7,'0'), 'CR-' || lpad(g::text,8,'0'), 'client' || g || '@example.com',
  so.sid, so.org_id,
  (ARRAY['lead','contacted','follow_up','proposal_sent','negotiation','onboarding_in_progress','onboarded','active_client','inactive','lost','cancelled'])[1 + (g % 11)],
  now() - (random()*365 || ' days')::interval
FROM generate_series(1,30000) g JOIN sm_org so ON so.rn = ((g-1) % 60) + 1;
-- 300k client logs over 12 months
INSERT INTO client_logs (client_id, action, done_by, created_at)
SELECT c.id, (ARRAY['Status changed to onboarded','Status changed to follow_up','Status changed to lead','Status changed to lost','Called client','Logged follow up','Status changed to active_client'])[1 + (g % 7)],
  c.assigned_salesman_id, now() - (random()*365 || ' days')::interval
FROM generate_series(1,300000) g JOIN clients c ON c.id = (SELECT min(id) FROM clients) + (g % 30000);
INSERT INTO salesman_kpi_logs (salesman_id, action) SELECT s.id, (ARRAY['onboarded','lead','follow_up','lost'])[1 + g%4] FROM generate_series(1,20000) g JOIN sm s ON s.rn = 1 + g%60;
-- 40k tasks
INSERT INTO tasks (assigned_to_id, created_by_id, description, due_date, notification, status)
SELECT s.id, CASE WHEN g%3=0 THEN s.id ELSE ms.manager_id END, 'Task ' || g, now() + ((random()*120-60) || ' days')::interval, g%5=0,
  (ARRAY['pending','in_process','achieved','unsuccessful'])[1+g%4]
FROM generate_series(1,40000) g JOIN sm s ON s.rn = 1 + g%60 JOIN manager_salesman ms ON ms.salesman_id = s.id;
INSERT INTO client_tasks (client_id, assigned_to_id, created_by_id, description, due_date, status)
SELECT c.id, c.assigned_salesman_id, c.assigned_salesman_id, 'Client task ' || g, now() + ((random()*60-30) || ' days')::interval, (ARRAY['pending','in_process','achieved','unsuccessful'])[1+g%4]
FROM generate_series(1,10000) g JOIN clients c ON c.id = (SELECT min(id) FROM clients) + (g*3 % 30000);
-- 15k enquiries
INSERT INTO enquiries (client_id, enquiry_date, mode, "from", "to", job_ref, incoterm, payment_mode, credit_days, clearance, provisional_cost, provisional_profit, status, created_by_id, created_at, updated_at)
SELECT c.id, (now() - (d || ' days')::interval)::date, (ARRAY['air','land','sea'])[1+g%3], 'Origin ' || g%50, 'Dest ' || g%40, (ARRAY['SEFL','SEGN','SIFL','AEGN','AIGN','REGN','LTPT','WHST'])[1+g%8], (ARRAY['EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'])[1+g%10],
  (ARRAY['card','cash','credit'])[1+g%3], CASE WHEN g%3=2 THEN 30 END, g%2=0, 500 + (g%50)*20, 100 + (g%20)*10, 'open', c.assigned_salesman_id, now() - (d || ' days')::interval, now()
FROM (SELECT g, floor(random()*365)::int d FROM generate_series(1,15000) g) x JOIN clients c ON c.id = (SELECT min(id) FROM clients) + (g*7 % 30000);
-- 8k converted -> orders; 4k direct orders
UPDATE enquiries SET status='order_created', actual_cost=provisional_cost, actual_profit=provisional_profit WHERE id % 15 < 8;
INSERT INTO orders (client_id, mode, description, payment_mode, amount, advance_amount, "from", "to", status, accounts_approval, manager_approval, created_by_id, enquiry_id, job_no, invoice_date, due_date, created_at, updated_at)
SELECT e.client_id, e.mode, 'Order from enquiry ' || e.id, e.payment_mode, e.actual_cost+e.actual_profit, CASE WHEN e.id%4=0 THEN 100 ELSE 0 END, e."from", e."to",
  (ARRAY['draft','draft','completed','cancelled'])[1+e.id%4], (ARRAY['pending','approved','rejected'])[1+e.id%3], (ARRAY['pending','approved','rejected'])[1+(e.id+1)%3],
  e.created_by_id, e.id, 'JOB-' || e.id, e.enquiry_date, e.enquiry_date + 30, e.created_at + interval '2 days', now()
FROM enquiries e WHERE e.status='order_created';
INSERT INTO orders (client_id, mode, description, payment_mode, amount, advance_amount, "from", "to", status, created_by_id, created_at, updated_at)
SELECT c.id, 'sea', 'Direct order ' || g, (ARRAY['card','cash','credit'])[1+g%3], 1000 + g%300, 0, 'A', 'B', (ARRAY['draft','completed','cancelled'])[1+g%3], c.assigned_salesman_id, now() - (random()*365 || ' days')::interval, now()
FROM generate_series(1,4000) g JOIN clients c ON c.id = (SELECT min(id) FROM clients) + (g*11 % 30000);
-- ~20k payments: 2/3 of orders get payments, half fully paid
INSERT INTO order_payments (order_id, amount, paid_on, method, recorded_by_id)
SELECT o.id, CASE WHEN o.id%2=0 THEN (o.amount-o.advance_amount)/2 ELSE (o.amount-o.advance_amount)/3 END, (o.created_at + interval '10 days')::date, 'cash', o.created_by_id
FROM orders o CROSS JOIN generate_series(1,2) k WHERE o.id%3 <> 0;
-- follow-ups + targets
INSERT INTO enquiry_follow_ups (enquiry_id, comment, created_by_id, created_at) SELECT e.id, 'Followed up ' || k, e.created_by_id, e.created_at + (k || ' days')::interval FROM enquiries e CROSS JOIN generate_series(1,2) k WHERE e.status='open' AND e.id%2=0;
INSERT INTO salesman_targets (salesman_id, set_by_id, amount, period_start, period_end)
SELECT s.id, ms.manager_id, 50000, (date_trunc('month', now()) - (m || ' months')::interval)::date, (date_trunc('month', now()) - ((m-1) || ' months')::interval - interval '1 day')::date
FROM sm s JOIN manager_salesman ms ON ms.salesman_id=s.id CROSS JOIN generate_series(0,11) m;
INSERT INTO shipping_rates (location, port, carrier, mode, container, price, updated_by_id, updated_at)
SELECT 'Loc ' || g, 'Port ' || (g%20), 'Carrier', (ARRAY['air','land','sea'])[1+g%3], (ARRAY['20ft','40ft','LCL'])[1+g%3], 100+g, 1, now() FROM generate_series(1,300) g;
ANALYZE;
SELECT (SELECT count(*) FROM clients) clients, (SELECT count(*) FROM client_logs) logs, (SELECT count(*) FROM tasks) tasks, (SELECT count(*) FROM enquiries) enq, (SELECT count(*) FROM orders) orders, (SELECT count(*) FROM order_payments) payments;
