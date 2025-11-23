-- Add UPDATE policies for bank advice history tables to allow admins and managers to update records

-- Policy for bank_advice_history table
CREATE POLICY "Admins and managers can update bank advice history"
ON bank_advice_history
FOR UPDATE
TO public
USING (has_designation(auth.uid(), 'admin'::app_designation) OR has_designation(auth.uid(), 'manager'::app_designation))
WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation) OR has_designation(auth.uid(), 'manager'::app_designation));

-- Policy for quick_payment_bank_advice_history table
CREATE POLICY "Admins and managers can update quick payment bank advice history"
ON quick_payment_bank_advice_history
FOR UPDATE
TO public
USING (has_designation(auth.uid(), 'admin'::app_designation) OR has_designation(auth.uid(), 'manager'::app_designation))
WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation) OR has_designation(auth.uid(), 'manager'::app_designation));

-- Policy for staff_payment_bank_advice_history table
CREATE POLICY "Admins and managers can update staff payment bank advice history"
ON staff_payment_bank_advice_history
FOR UPDATE
TO public
USING (has_designation(auth.uid(), 'admin'::app_designation) OR has_designation(auth.uid(), 'manager'::app_designation))
WITH CHECK (has_designation(auth.uid(), 'admin'::app_designation) OR has_designation(auth.uid(), 'manager'::app_designation));