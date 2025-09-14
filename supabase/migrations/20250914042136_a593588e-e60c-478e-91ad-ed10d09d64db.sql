-- Add test doctor records with doctor codes for login
INSERT INTO public.doctors (specialization, doctor_code, rate_per_visit, is_active)
SELECT 'Cardiology', 'DOC001', 1500.00, true
WHERE NOT EXISTS (SELECT 1 FROM public.doctors WHERE doctor_code = 'DOC001');

INSERT INTO public.doctors (specialization, doctor_code, rate_per_visit, is_active)
SELECT 'General Medicine', 'DOC002', 1200.00, true
WHERE NOT EXISTS (SELECT 1 FROM public.doctors WHERE doctor_code = 'DOC002');

-- Create some visits for the doctors so they have data to see
DO $$
DECLARE
    doc1_id uuid;
    doc2_id uuid;
BEGIN
    -- Get doctor IDs
    SELECT id INTO doc1_id FROM public.doctors WHERE doctor_code = 'DOC001' LIMIT 1;
    SELECT id INTO doc2_id FROM public.doctors WHERE doctor_code = 'DOC002' LIMIT 1;
    
    -- Insert visits for doctor 1
    IF doc1_id IS NOT NULL THEN
        INSERT INTO public.visits (doctor_id, patient_name, patient_id, visit_reason, visit_payment, payment_type, visit_date)
        SELECT doc1_id, 'John Smith', 'PAT001', 'Regular checkup', 1500.00, 'cash', '2024-01-15'
        WHERE NOT EXISTS (SELECT 1 FROM public.visits WHERE doctor_id = doc1_id AND patient_id = 'PAT001');
        
        INSERT INTO public.visits (doctor_id, patient_name, patient_id, visit_reason, visit_payment, payment_type, visit_date)
        SELECT doc1_id, 'Mary Johnson', 'PAT002', 'Follow-up consultation', 1500.00, 'card', '2024-01-16'
        WHERE NOT EXISTS (SELECT 1 FROM public.visits WHERE doctor_id = doc1_id AND patient_id = 'PAT002');
    END IF;
    
    -- Insert visits for doctor 2
    IF doc2_id IS NOT NULL THEN
        INSERT INTO public.visits (doctor_id, patient_name, patient_id, visit_reason, visit_payment, payment_type, visit_date)
        SELECT doc2_id, 'Robert Brown', 'PAT003', 'General consultation', 1200.00, 'cash', '2024-01-17'
        WHERE NOT EXISTS (SELECT 1 FROM public.visits WHERE doctor_id = doc2_id AND patient_id = 'PAT003');
    END IF;
    
    -- Create payment records for doctors
    IF doc1_id IS NOT NULL THEN
        INSERT INTO public.payments (doctor_id, period_start, period_end, total_visits, rate_per_visit, total_amount, status)
        SELECT doc1_id, '2024-01-01', '2024-01-31', 2, 1500.00, 3000.00, 'pending'
        WHERE NOT EXISTS (SELECT 1 FROM public.payments WHERE doctor_id = doc1_id);
    END IF;
    
    IF doc2_id IS NOT NULL THEN
        INSERT INTO public.payments (doctor_id, period_start, period_end, total_visits, rate_per_visit, total_amount, status)
        SELECT doc2_id, '2024-01-01', '2024-01-31', 1, 1200.00, 1200.00, 'approved'
        WHERE NOT EXISTS (SELECT 1 FROM public.payments WHERE doctor_id = doc2_id);
    END IF;
END $$;

-- Create tasks for the test staff
DO $$
DECLARE
    nurse_id uuid;
    tech_id uuid;
BEGIN
    -- Get staff IDs
    SELECT id INTO nurse_id FROM public.staff WHERE username = 'nurse1' LIMIT 1;
    SELECT id INTO tech_id FROM public.staff WHERE username = 'tech1' LIMIT 1;
    
    -- Create tasks for nurse
    IF nurse_id IS NOT NULL THEN
        INSERT INTO public.tasks (assigned_to, task_title, task_description, priority, status)
        SELECT nurse_id, 'Patient Care Round', 'Complete morning patient care rounds in Ward A', 'high', 'pending'
        WHERE NOT EXISTS (SELECT 1 FROM public.tasks WHERE assigned_to = nurse_id AND task_title = 'Patient Care Round');
        
        INSERT INTO public.tasks (assigned_to, task_title, task_description, priority, status)
        SELECT nurse_id, 'Medication Administration', 'Administer scheduled medications to patients', 'high', 'in_progress'
        WHERE NOT EXISTS (SELECT 1 FROM public.tasks WHERE assigned_to = nurse_id AND task_title = 'Medication Administration');
    END IF;
    
    -- Create tasks for technician
    IF tech_id IS NOT NULL THEN
        INSERT INTO public.tasks (assigned_to, task_title, task_description, priority, status)
        SELECT tech_id, 'Lab Sample Collection', 'Collect blood samples from patients in Room 101-105', 'medium', 'pending'
        WHERE NOT EXISTS (SELECT 1 FROM public.tasks WHERE assigned_to = tech_id AND task_title = 'Lab Sample Collection');
        
        INSERT INTO public.tasks (assigned_to, task_title, task_description, priority, status)
        SELECT tech_id, 'Equipment Maintenance', 'Perform routine maintenance on lab equipment', 'low', 'completed'
        WHERE NOT EXISTS (SELECT 1 FROM public.tasks WHERE assigned_to = tech_id AND task_title = 'Equipment Maintenance');
    END IF;
END $$;