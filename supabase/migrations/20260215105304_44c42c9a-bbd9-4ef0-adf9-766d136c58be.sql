DELETE FROM public.appraisal_criteria_master
WHERE criteria_code NOT IN ('punctuality', 'work_quality');