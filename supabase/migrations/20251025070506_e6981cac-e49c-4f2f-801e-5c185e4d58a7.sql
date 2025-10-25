-- Delete test quick payment transactions for SILICON I COMPUTERS
DELETE FROM public.quick_payments 
WHERE id IN (
  '8dc8d4ce-17f8-4ec0-a778-1abe2f34b2e9',
  '5b4eb0f7-70f6-4352-a93a-9a589ef48243'
);