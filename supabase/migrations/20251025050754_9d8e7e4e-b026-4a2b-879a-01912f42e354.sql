-- Create storage bucket for quick payment documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quick-payment-documents',
  'quick-payment-documents',
  false,
  5242880,
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg']
);

-- Add document columns to quick_payments table
ALTER TABLE public.quick_payments 
  ADD COLUMN supporting_document_path TEXT,
  ADD COLUMN supporting_document_name TEXT,
  ADD COLUMN supporting_document_type TEXT;

-- RLS policies for storage bucket
CREATE POLICY "Admins and managers can upload quick payment documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'quick-payment-documents' AND
    (has_designation(auth.uid(), 'admin'::app_designation) OR 
     has_designation(auth.uid(), 'manager'::app_designation))
  );

CREATE POLICY "Admins and managers can view quick payment documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'quick-payment-documents' AND
    (has_designation(auth.uid(), 'admin'::app_designation) OR 
     has_designation(auth.uid(), 'manager'::app_designation))
  );

CREATE POLICY "Admins and managers can delete quick payment documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'quick-payment-documents' AND
    (has_designation(auth.uid(), 'admin'::app_designation) OR 
     has_designation(auth.uid(), 'manager'::app_designation))
  );