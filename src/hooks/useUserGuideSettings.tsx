import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface UserGuideSettings {
  id: string;
  is_active: boolean;
  welcome_message_admin: string | null;
  welcome_message_manager: string | null;
  welcome_message_doctor: string | null;
  welcome_message_staff: string | null;
  help_desk_contact: string | null;
  help_desk_email: string | null;
  help_desk_hours: string | null;
  faq_items: FAQItem[];
  tutorial_video_urls: Record<string, string>;
  custom_notes: Record<string, string>;
  announcement_text: string | null;
  announcement_type: string | null;
  show_announcement: boolean;
}

export const useUserGuideSettings = () => {
  return useQuery({
    queryKey: ["user-guide-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_guide_settings")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) throw error;
      
      // Parse JSON fields
      const parsedData: UserGuideSettings = {
        ...data,
        faq_items: (data.faq_items as any) || [],
        tutorial_video_urls: (data.tutorial_video_urls as any) || {},
        custom_notes: (data.custom_notes as any) || {}
      };
      
      return parsedData;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useUpdateUserGuideSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<UserGuideSettings>) => {
      const { data, error } = await supabase
        .from("user_guide_settings")
        .update(settings as any)
        .eq("is_active", true)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-guide-settings"] });
      toast.success("User guide settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });
};
