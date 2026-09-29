import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Mail, XCircle } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = 'loading' | 'valid' | 'already' | 'invalid' | 'done' | 'error';

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [state, setState] = useState<State>('loading');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setState('invalid');
        return;
      }
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_KEY } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.valid === false) {
          setState(data?.reason === 'already_used' || data?.used ? 'already' : 'invalid');
          return;
        }
        setState(data?.used ? 'already' : 'valid');
      } catch {
        setState('error');
      }
    };
    validate();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    const { error } = await supabase.functions.invoke('handle-email-unsubscribe', {
      body: { token },
    });
    setSubmitting(false);
    setState(error ? 'error' : 'done');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>WestMed Payroll emails</CardTitle>
          <CardDescription>
            {state === 'loading' && 'Checking your link…'}
            {state === 'valid' && 'Confirm that you no longer want to receive these emails.'}
            {state === 'already' && 'You are already unsubscribed.'}
            {state === 'invalid' && 'This unsubscribe link is invalid or has expired.'}
            {state === 'done' && 'You have been unsubscribed.'}
            {state === 'error' && 'Something went wrong. Please try again.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {state === 'valid' && (
            <Button onClick={confirm} disabled={submitting} className="w-full">
              {submitting ? 'Unsubscribing…' : 'Confirm unsubscribe'}
            </Button>
          )}
          {state === 'done' && (
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          )}
          {(state === 'invalid' || state === 'error') && (
            <XCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default Unsubscribe;
