import { supabase } from '@/integrations/supabase/client';

/**
 * Doctor notification helpers.
 *
 * Emails are only sent when the doctor has a valid email address on their
 * linked account — the edge function silently skips otherwise. Failures never
 * block the calling UI flow.
 */

export async function notifyDoctorVisitCreated(visitId: string) {
  if (!visitId) return;
  try {
    await supabase.functions.invoke('notify-doctor-event', {
      body: { event: 'visit_created', visitId },
    });
  } catch (error) {
    console.error('Doctor visit notification failed', error);
  }
}

export async function notifyDoctorBankAdvice(params: {
  paymentIds: string[];
  reference?: string;
  mode?: string;
}) {
  const { paymentIds, reference, mode } = params;
  if (!paymentIds?.length) return;
  try {
    await supabase.functions.invoke('notify-doctor-event', {
      body: { event: 'bank_advice_generated', paymentIds, reference, mode },
    });
  } catch (error) {
    console.error('Doctor bank advice notification failed', error);
  }
}
