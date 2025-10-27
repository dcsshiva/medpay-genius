import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, RefreshCw, Eye, FileText, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDateTimeIST } from '@/lib/dateUtils';

interface GeneratedAdvice {
  id: string;
  filename: string;
  generation_date: string;
  created_at: string;
  payment_count: number;
  total_amount: number;
  payment_ids: string[];
  file_content: string;
  generated_by: string;
  generator_name?: string;
  payment_source: 'doctor' | 'quick_payment';
}

interface BankDetailsComparison {
  beneficiary_name: string;
  original_ifsc: string;
  latest_ifsc: string;
  original_account: string;
  latest_account: string;
  has_changes: boolean;
}

export const BetaGeneratedAdviceTab: React.FC = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<GeneratedAdvice[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [comparisonDialog, setComparisonDialog] = useState(false);
  const [comparison, setComparison] = useState<BankDetailsComparison[]>([]);

  useEffect(() => {
    fetchGeneratedAdvice();
  }, []);

  const fetchGeneratedAdvice = async () => {
    setLoading(true);
    try {
      // Fetch from both history tables
      const [doctorResult, quickResult] = await Promise.all([
        supabase
          .from('bank_advice_history')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('quick_payment_bank_advice_history')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (doctorResult.error) throw doctorResult.error;
      if (quickResult.error) throw quickResult.error;

      const doctorRecords = (doctorResult.data || []).map((r: any) => ({
        ...r,
        payment_source: 'doctor' as const,
      }));

      const quickRecords = (quickResult.data || []).map((r: any) => ({
        ...r,
        payment_source: 'quick_payment' as const,
        total_amount: r.total_net_amount || 0,
      }));

      const allRecords = [...doctorRecords, ...quickRecords].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Fetch generator names
      const recordsWithGenerators = await Promise.all(
        allRecords.map(async (record: any) => {
          if (record.generated_by) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', record.generated_by)
              .single();

            return {
              ...record,
              generator_name: profile?.full_name || 'Unknown',
            };
          }
          return { ...record, generator_name: 'Unknown' };
        })
      );

      setRecords(recordsWithGenerators);
    } catch (error) {
      console.error('Error fetching generated advice:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch generated advice',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (record: GeneratedAdvice) => {
    if (!record.file_content) {
      toast({
        title: 'Error',
        description: 'File content not available',
        variant: 'destructive',
      });
      return;
    }

    const blob = new Blob([record.file_content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = record.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: `Downloaded ${record.filename}`,
    });
  };

  const handleRegenerate = async (record: GeneratedAdvice) => {
    setRegenerating(record.id);
    try {
      // Fetch latest bank details for all payments
      const comparisons: BankDetailsComparison[] = [];

      if (record.payment_source === 'doctor') {
        const { data: payments } = await supabase
          .from('payments')
          .select(`
            id,
            doctors (
              full_name,
              ifsc_code,
              bank_account_number
            )
          `)
          .in('id', record.payment_ids);

        // Parse original IFSC from file content
        const lines = record.file_content.split('\n');
        
        payments?.forEach((payment: any) => {
          const doctor = payment.doctors;
          // Find the line in GEFU file for this payment
          const detailLine = lines.find(line => 
            line.startsWith('D~') && line.includes(doctor.bank_account_number)
          );
          
          const originalIfsc = detailLine?.split('~')[7] || '';
          const originalAccount = detailLine?.split('~')[8] || '';

          comparisons.push({
            beneficiary_name: doctor.full_name,
            original_ifsc: originalIfsc,
            latest_ifsc: doctor.ifsc_code || '',
            original_account: originalAccount,
            latest_account: doctor.bank_account_number || '',
            has_changes: originalIfsc !== doctor.ifsc_code || originalAccount !== doctor.bank_account_number,
          });
        });
      }

      setComparison(comparisons);
      setComparisonDialog(true);

      // Regenerate file with latest details
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          *,
          doctors (*)
        `)
        .in('id', record.payment_ids);

      // Rebuild GEFU format with latest bank details
      // (Use same logic as original generation but with latest data)
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yy = String(today.getFullYear()).slice(-2);

      let gefuContent = `H~${dd}/${mm}/20${yy}~WESTMED\n`;
      
      payments?.forEach((payment: any, index: number) => {
        const doctor = payment.doctors;
        const seq = String(index + 1).padStart(6, '0');
        const netAmount = payment.net_amount.toFixed(2);

        gefuContent += `D~N06~HOSPITAL_ACCOUNT~HOSPITAL_NAME~ADDRESS1~ADDRESS2~ADDRESS3~${doctor.ifsc_code}~${doctor.bank_account_number}~${doctor.account_holder_name}~~~~~${seq}~${dd}/${mm}/20${yy}~${netAmount}~${seq}~~~~\n`;
      });

      const totalNet = payments?.reduce((sum: number, p: any) => sum + Number(p.net_amount), 0) || 0;
      gefuContent += `F~${payments?.length || 0}~${totalNet.toFixed(2)}\n`;

      // Download regenerated file
      const blob = new Blob([gefuContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = record.filename.replace('.txt', '-updated.txt');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Bank advice regenerated with latest details',
      });
    } catch (error) {
      console.error('Error regenerating:', error);
      toast({
        title: 'Error',
        description: 'Failed to regenerate bank advice',
        variant: 'destructive',
      });
    } finally {
      setRegenerating(null);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generated Bank Advice ({records.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {records.map((record, index) => (
              <Card key={record.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{record.filename}</p>
                          <Badge variant="outline">{record.payment_count} payments</Badge>
                          <Badge variant={record.payment_source === 'doctor' ? 'default' : 'secondary'}>
                            {record.payment_source === 'doctor' ? 'Doctor' : 'Quick Payment'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Generated: {formatDateTimeIST(record.created_at)}
                          </span>
                          <span>by {record.generator_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(record.total_amount)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(record)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerate(record)}
                          disabled={regenerating === record.id}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${regenerating === record.id ? 'animate-spin' : ''}`} />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {records.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Generated Advice</h3>
                <p className="text-muted-foreground">
                  No bank advice files have been generated yet.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Dialog */}
      <Dialog open={comparisonDialog} onOpenChange={setComparisonDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bank Details Comparison</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comparison.map((comp, idx) => (
              <Card key={idx} className={comp.has_changes ? 'border-orange-500' : ''}>
                <CardContent className="p-4">
                  <p className="font-medium mb-2">{comp.beneficiary_name}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Original IFSC</p>
                      <p className="font-mono">{comp.original_ifsc}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Updated IFSC</p>
                      <p className="font-mono flex items-center gap-2">
                        {comp.latest_ifsc}
                        {comp.has_changes && <Badge variant="destructive">Changed</Badge>}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
