-- One-off backfill after adding orders.paid_total (idempotent; safe to re-run).
UPDATE orders o
SET paid_total = o.advance_amount + COALESCE((SELECT SUM(p.amount) FROM order_payments p WHERE p.order_id = o.id), 0);

-- Enquiry "completed" is now stored: its order is not cancelled and is paid in full.
UPDATE enquiries e
SET status = CASE WHEN o.status <> 'cancelled' AND o.paid_total >= o.amount - 0.005 THEN 'completed' ELSE 'order_created' END
FROM orders o
WHERE o.enquiry_id = e.id AND e.status IN ('order_created', 'completed');
