-- Fix user designations with correct user_ids (now that super_admin enum exists)
UPDATE user_designations 
SET designation = 'super_admin', updated_at = now()
WHERE user_id = 'db153c07-9f73-4154-944f-614008ef8ea9';

UPDATE user_designations 
SET designation = 'admin', updated_at = now()
WHERE user_id = 'f89f488a-5bd2-4b38-a0af-a96d09061466';

UPDATE user_designations 
SET designation = 'manager', updated_at = now()
WHERE user_id = '9251c442-863a-4b26-be4d-fd2fd3d02c1c';

UPDATE user_designations 
SET designation = 'manager', updated_at = now()
WHERE user_id = '341548fa-2679-4d3a-92f9-4990782baf5c';