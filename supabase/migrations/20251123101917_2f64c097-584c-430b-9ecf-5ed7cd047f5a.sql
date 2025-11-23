-- Add reconciliation proof file columns to bank advice history tables
ALTER TABLE bank_advice_history 
  ADD COLUMN IF NOT EXISTS reconciliation_proof_file_path TEXT,
  ADD COLUMN IF NOT EXISTS reconciliation_proof_file_name TEXT;

ALTER TABLE quick_payment_bank_advice_history 
  ADD COLUMN IF NOT EXISTS reconciliation_proof_file_path TEXT,
  ADD COLUMN IF NOT EXISTS reconciliation_proof_file_name TEXT;

ALTER TABLE staff_payment_bank_advice_history 
  ADD COLUMN IF NOT EXISTS reconciliation_proof_file_path TEXT,
  ADD COLUMN IF NOT EXISTS reconciliation_proof_file_name TEXT;

-- Create storage bucket for bank reconciliation proof files
INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-reconciliation-proofs', 'bank-reconciliation-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow authenticated admin/manager users to upload
CREATE POLICY "Admins and managers can upload reconciliation proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bank-reconciliation-proofs' 
  AND (
    has_designation(auth.uid(), 'admin'::app_designation) 
    OR has_designation(auth.uid(), 'manager'::app_designation)
  )
);

-- RLS Policy: Allow authenticated users to view reconciliation proofs
CREATE POLICY "Authenticated users can view reconciliation proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bank-reconciliation-proofs');

-- RLS Policy: Allow admins and managers to delete reconciliation proofs
CREATE POLICY "Admins and managers can delete reconciliation proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bank-reconciliation-proofs'
  AND (
    has_designation(auth.uid(), 'admin'::app_designation)
    OR has_designation(auth.uid(), 'manager'::app_designation)
  )
);