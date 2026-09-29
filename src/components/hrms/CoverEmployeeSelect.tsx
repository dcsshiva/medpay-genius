import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  applicantId: string | null;
  value?: string;
  onChange: (id: string) => void;
  className?: string;
}

/** HRMS: pick a colleague (same work branch) who will cover the applicant's work. */
const CoverEmployeeSelect: React.FC<Props> = ({ applicantId, value, onChange, className }) => {
  const [options, setOptions] = useState<Array<{ id: string; full_name: string; staff_code: string }>>([]);

  useEffect(() => {
    if (!applicantId) return;
    (supabase as any)
      .rpc('get_cover_candidates', { _applicant_id: applicantId })
      .then(({ data }: any) => setOptions(data || []));
  }, [applicantId]);

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={className ?? 'min-h-[44px]'}>
        <SelectValue placeholder="Select who will cover your work" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.length === 0 && (
          <SelectItem value="__none__" disabled>No colleagues found in your branch</SelectItem>
        )}
        {options.map(o => (
          <SelectItem key={o.id} value={o.id}>{o.full_name} ({o.staff_code})</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CoverEmployeeSelect;
