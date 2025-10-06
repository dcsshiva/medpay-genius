-- Clear all data from payment-related tables
-- This keeps the table structure but removes all records

TRUNCATE TABLE public.payment_transactions CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.visits CASCADE;