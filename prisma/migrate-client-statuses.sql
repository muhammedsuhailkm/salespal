-- One-off: move clients from retired statuses onto the new client status list.
-- New list: lead, contacted, follow_up, enquiry, onboarded, dormant, lost, blacklisted.
-- Each move is written to client_logs (attributed to the assigned salesman). Idempotent: safe to re-run.
BEGIN;

CREATE TEMP TABLE status_map (old_status text PRIMARY KEY, new_status text NOT NULL) ON COMMIT DROP;
INSERT INTO status_map VALUES
  ('proposal_sent',          'follow_up'),
  ('negotiation',            'follow_up'),
  ('onboarding_in_progress', 'enquiry'),
  ('active_client',          'onboarded'),
  ('inactive',               'dormant'),
  ('cancelled',              'lost');

INSERT INTO client_logs (client_id, action, done_by, created_at)
SELECT c.id, 'Status changed to ' || m.new_status || ' (status list update, was ' || m.old_status || ')', c.assigned_salesman_id, NOW()
FROM clients c JOIN status_map m ON m.old_status = c.status;

UPDATE clients c SET status = m.new_status
FROM status_map m WHERE m.old_status = c.status;

COMMIT;
