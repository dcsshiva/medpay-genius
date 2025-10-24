-- Create vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  vendor_code TEXT UNIQUE NOT NULL,
  vendor_name TEXT NOT NULL,
  contact_person_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL CHECK (mobile_number ~ '^[0-9]{10}$'),
  email TEXT,
  address TEXT,
  
  -- Business Information
  gst_number TEXT,
  
  -- Bank Details
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  branch_name TEXT,
  account_holder_name TEXT,
  
  -- Standard Fields
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_vendors_code ON public.vendors(vendor_code);
CREATE INDEX idx_vendors_active ON public.vendors(is_active);

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage vendors"
  ON public.vendors FOR ALL
  USING (has_designation(auth.uid(), 'admin'::app_designation));

CREATE POLICY "Anyone can view active vendors"
  ON public.vendors FOR SELECT
  USING (is_active = true);

-- Update trigger
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update quick_payments table to add vendor tracking
ALTER TABLE public.quick_payments 
  ADD COLUMN vendor_id UUID REFERENCES public.vendors(id),
  ADD COLUMN gst_number TEXT;

-- Index for vendor lookup
CREATE INDEX idx_quick_payments_vendor ON public.quick_payments(vendor_id);