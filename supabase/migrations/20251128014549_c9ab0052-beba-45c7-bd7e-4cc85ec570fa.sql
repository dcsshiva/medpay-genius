
-- Reverse the partial payment release for DOC143 payment (₹58,500)
-- Payment ID: 022c0b9d-d097-4e93-ac1f-88bfb687de65

-- Delete all payment releases for this payment
DELETE FROM payment_releases 
WHERE payment_id = '022c0b9d-d097-4e93-ac1f-88bfb687de65';

-- Reset the payment to its approved state (before any releases)
UPDATE payments
SET 
  total_released_gross = 0,
  total_released_tds = 0,
  total_released_net = 0,
  release_count = 0,
  release_status = 'not_started',
  paid_amount = 0,
  is_fully_paid = false,
  remaining_amount = gross_amount
WHERE id = '022c0b9d-d097-4e93-ac1f-88bfb687de65';
