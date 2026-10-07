-- One-off: move enquiries and orders onto the new stage workflow (see lib/enquiry-flow.ts). Idempotent.
--   Enquiries: open → quoted (all have cost & profit) or inquiry_received (no figures),
--              order_created / completed → confirmed, cancelled → lost.
--   Orders:    draft → transit; completed / cancelled unchanged. origin_enquiry_id backfilled.
BEGIN;

UPDATE enquiries SET status = CASE
    WHEN provisional_cost IS NOT NULL AND provisional_profit IS NOT NULL THEN 'quoted'
    ELSE 'inquiry_received' END
WHERE status = 'open';
UPDATE enquiries SET status = 'confirmed' WHERE status IN ('order_created', 'completed');
UPDATE enquiries SET status = 'lost' WHERE status = 'cancelled';

UPDATE orders SET status = 'transit' WHERE status = 'draft';
UPDATE orders SET origin_enquiry_id = enquiry_id WHERE enquiry_id IS NOT NULL AND origin_enquiry_id IS NULL;

COMMIT;
