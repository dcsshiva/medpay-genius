/**
 * User Profile Utility
 * Consolidated helper to get complete user profile regardless of type (staff/doctor)
 * Uses user_designations as single source of truth for roles
 */

import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  designation: string;
  user_id: string;
  id: string;
  code: string;
  full_name: string;
  is_active: boolean;
  email?: string;
  phone?: string;
  // Staff specific
  username?: string;
  role?: string;
  department?: string;
  // Doctor specific
  specialization?: string;
  // Bank details
  bank_details?: {
    account_number?: string;
    account_holder_name?: string;
    bank_name?: string;
    branch_name?: string;
    ifsc_code?: string;
    pan_number?: string;
  };
}

/**
 * Get complete user profile based on their designation
 * This is the recommended way to fetch user data across the application
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // Get user's designation (single source of truth for roles)
    const { data: designationData, error: designationError } = await supabase
      .from('user_designations')
      .select('designation')
      .eq('user_id', userId)
      .single();

    if (designationError || !designationData) {
      console.error('User designation not found:', designationError);
      return null;
    }

    const designation = designationData.designation;

    // Fetch profile based on designation
    if (designation === 'doctor') {
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (doctorError || !doctor) {
        console.error('Doctor profile not found:', doctorError);
        return null;
      }

      // Get email from auth.users if available
      const { data: authData } = await supabase.auth.admin.getUserById(userId);

      return {
        designation,
        user_id: doctor.user_id,
        id: doctor.id,
        code: doctor.doctor_code,
        full_name: doctor.full_name || 'Doctor',
        specialization: doctor.specialization,
        is_active: doctor.is_active,
        email: authData?.user?.email,
        bank_details: {
          account_number: doctor.bank_account_number,
          account_holder_name: doctor.account_holder_name,
          bank_name: doctor.bank_name,
          branch_name: doctor.branch_name,
          ifsc_code: doctor.ifsc_code,
          pan_number: doctor.pan_number
        }
      };
    } else {
      // Staff, admin, manager, etc.
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (staffError || !staff) {
        console.error('Staff profile not found:', staffError);
        return null;
      }

      return {
        designation,
        user_id: staff.user_id,
        id: staff.id,
        code: staff.staff_code,
        full_name: staff.full_name,
        username: staff.username,
        role: staff.role,
        department: staff.department,
        is_active: staff.is_active,
        email: staff.email,
        phone: staff.phone,
        bank_details: {
          account_number: staff.bank_account_number,
          account_holder_name: staff.account_holder_name,
          bank_name: staff.bank_name,
          branch_name: staff.branch_name,
          ifsc_code: staff.ifsc_code
        }
      };
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Check if user has specific designation
 * Wrapper around has_designation RPC function
 */
export async function hasDesignation(
  userId: string,
  designation: 'admin' | 'manager' | 'doctor' | 'staff' | 'super_admin'
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_designation', {
      _user_id: userId,
      _designation: designation
    });

    if (error) {
      console.error('Error checking designation:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasDesignation:', error);
    return false;
  }
}
