-- Fix the old partial payment for payment id 022c0b9d-d097-4e93-ac1f-88bfb687de65
-- This payment was partially paid through old system (paid_amount = 26325 net)
-- Need to migrate to new part payment structure

-- First, update the payments table with correct release tracking fields
UPDATE payments 
SET 
  total_released_gross = 29250,  -- 26325 / 0.9 = 29250 (convert net to gross)
  total_released_tds = 2925,      -- 29250 * 0.10 = 2925
  total_released_net = 26325,     -- Original paid_amount
  release_count = 1,
  release_status = 'partial'
WHERE id = '022c0b9d-d097-4e93-ac1f-88bfb687de65'
  AND total_released_gross = 0;  -- Only update if not already migrated

-- Create the corresponding payment_release record
INSERT INTO payment_releases (
  payment_id,
  release_number,
  release_percentage,
  gross_amount,
  tds_percentage,
  tds_amount,
  net_amount,
  release_status,
  bank_advice_generated,
  notes,
  released_at
)
SELECT 
  '022c0b9d-d097-4e93-ac1f-88bfb687de65',
  1,
  50.0,  -- 50% release
  29250,
  10,
  2925,
  26325,
  'completed',
  TRUE,  -- Bank advice was already generated for this payment
  'Migrated from old payment system - original partial payment',
  '2025-10-28 17:14:05.689+00'  -- Use the bank_advice_generated_at timestamp
WHERE NOT EXISTS (
  SELECT 1 FROM payment_releases 
  WHERE payment_id = '022c0b9d-d097-4e93-ac1f-88bfb687de65'
);