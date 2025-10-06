import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhyChooseUsPoint {
  title: string;
  description: string;
}

export interface WebsiteSettings {
  id: string;
  phone: string | null;
  emergency_contact: string | null;
  location: string | null;
  operating_hours: string | null;
  emergency_care_description: string | null;
  specialist_care_description: string | null;
  health_checkups_description: string | null;
  about_paragraph_1: string | null;
  about_paragraph_2: string | null;
  why_choose_us: WhyChooseUsPoint[];
  hero_headline: string | null;
  hero_tagline: string | null;
  book_appointment_text: string | null;
  emergency_button_text: string | null;
  hospital_name: string | null;
  logo_url: string | null;
  banner_url: string | null;
  years_of_service: number | null;
  expert_doctors: number | null;
  patients_served: string | null;
  patient_rating: number | null;
  copyright_text: string | null;
  hospital_bank_account_number: string | null;
  hospital_bank_account_holder_name: string | null;
  hospital_institution_address: string | null;
  hospital_institution_code: string | null;
}

export const useWebsiteSettings = () => {
  return useQuery({
    queryKey: ["website-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_settings")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) throw error;
      
      // Parse JSON field
      const parsedData: WebsiteSettings = {
        ...data,
        why_choose_us: (data.why_choose_us as any) || []
      };
      
      return parsedData;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useUpdateWebsiteSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<WebsiteSettings>) => {
      const { data, error } = await supabase
        .from("website_settings")
        .update(settings as any)
        .eq("is_active", true)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-settings"] });
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });
};

export const useUploadAsset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: "logo" | "banner" }) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from("website-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from("website-assets")
        .getPublicUrl(filePath);

      return data.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-settings"] });
      toast.success("Image uploaded successfully");
    },
    onError: (error) => {
      toast.error("Failed to upload image: " + error.message);
    },
  });
};
