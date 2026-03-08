import { supabase } from '@/integrations/supabase/client';

export const fetchDesignation = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_designations')
      .select('designation')
      .eq('user_id', userId)
      .single();
    
    if (!error && data) {
      return data.designation;
    }
  } catch (error) {
    console.error('Error fetching designation:', error);
  }
  return null;
};

// Helper to resolve full profile including doctor table ID and code
export const resolveFullProfile = async (userId: string) => {
  try {
    const { data: profileData } = await supabase.rpc('get_user_complete_profile', { _user_id: userId });
    if (profileData && typeof profileData === 'object' && !('error' in profileData)) {
      return profileData as any;
    }
  } catch (err) {
    console.error('Failed to fetch complete profile:', err);
  }
  return null;
};
