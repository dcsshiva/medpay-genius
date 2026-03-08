import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/currency';
import { 
  getFinancialYearOptions, 
  getQuarterOptions, 
  getQuarterDateRange,
  generateCertificateNumber 
} from '@/lib/tdsUtils';
import { FileText, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

interface Doctor {
  id: string;
  doctor_code: string;
  full_name: string;
  pan_number?: string;
}

interface Payment {
  id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  tds_amount: number;
  net_amount: number;
  bank_advice_generated_at: string;
}

export function TDSCertificateGenerator() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedFY, setSelectedFY] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [existingCertificates, setExistingCertificates] = useState<any[]>([]);

  useEffect(() => {
    fetchDoctors();
    fetchExistingCertificates();
  }, []);

  const fetchDoctors = async () => {
    try {
      let query = supabase
        .from('doctors')
        .select('id, doctor_code, full_name, pan_number')
        .eq('is_active', true)
        .order('doctor_code');

      // If user is a doctor, only show their own record
      if (userRole === 'doctor') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchExistingCertificates = async () => {
    try {
      let query = supabase
        .from('tds_certificates')
        .select('*')
        .order('generated_at', { ascending: false });

      if (userRole === 'doctor') {
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user?.id)
          .single();
        
        if (doctorData) {
          query = query.eq('doctor_id', doctorData.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setExistingCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    }
  };

  const fetchPaymentsForPeriod = async () => {
    if (!selectedDoctor || !selectedFY || !selectedQuarter) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select doctor, financial year, and quarter'
      });
      return;
    }

    setLoading(true);
    try {
      const { startDate, endDate } = getQuarterDateRange(selectedFY, selectedQuarter);
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('doctor_id', selectedDoctor)
        .eq('bank_advice_generated', true)
        .gte('period_end', format(startDate, 'yyyy-MM-dd'))
        .lte('period_end', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;
      
      setPayments(data || []);
      
      if (!data || data.length === 0) {
        toast({
          title: 'No Payments Found',
          description: 'No bank advice generated payments found for this period'
        });
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch payments for the selected period'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCertificate = async () => {
    if (payments.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Payments',
        description: 'No payments available to generate certificate'
      });
      return;
    }

    setGenerating(true);
    try {
      // Get doctor details
      const doctor = doctors.find(d => d.id === selectedDoctor);
      if (!doctor) throw new Error('Doctor not found');

      // Get hospital details
      const { data: websiteSettings } = await supabase
        .from('website_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      // Calculate totals
      const totalGross = payments.reduce((sum, p) => sum + (p.gross_amount || 0), 0);
      const totalTDS = payments.reduce((sum, p) => sum + (p.tds_amount || 0), 0);
      const totalNet = payments.reduce((sum, p) => sum + (p.net_amount || 0), 0);

      // Get next sequence number
      const { data: existingCerts } = await supabase
        .from('tds_certificates')
        .select('certificate_number')
        .eq('doctor_id', selectedDoctor)
        .eq('financial_year', selectedFY)
        .eq('quarter', selectedQuarter);

      const sequence = (existingCerts?.length || 0) + 1;
      const certificateNumber = generateCertificateNumber(
        selectedFY,
        selectedQuarter,
        doctor.doctor_code,
        sequence
      );

      // Generate PDF
      const pdf = new jsPDF();
      
      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('TDS CERTIFICATE', 105, 20, { align: 'center' });
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('(Tax Deducted at Source)', 105, 28, { align: 'center' });
      
      // Certificate Number
      pdf.setFontSize(10);
      pdf.text(`Certificate No: ${certificateNumber}`, 20, 40);
      pdf.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, 150, 40);
      
      // Hospital Details
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Deductor Details:', 20, 50);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(websiteSettings?.hospital_name || 'WestMed Hospital', 20, 57);
      pdf.text(websiteSettings?.hospital_institution_address || 'Hospital Address', 20, 63);
      
      // Doctor Details
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Deductee Details:', 20, 75);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Name: ${doctor.full_name}`, 20, 82);
      pdf.text(`Doctor Code: ${doctor.doctor_code}`, 20, 88);
      pdf.text(`PAN: ${doctor.pan_number || 'Not Provided'}`, 20, 94);
      
      // Period
      const { startDate, endDate } = getQuarterDateRange(selectedFY, selectedQuarter);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Period Covered:', 20, 106);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`${format(startDate, 'dd MMM yyyy')} to ${format(endDate, 'dd MMM yyyy')}`, 20, 113);
      pdf.text(`Financial Year: ${selectedFY}`, 20, 119);
      pdf.text(`Quarter: ${selectedQuarter}`, 20, 125);
      
      // Payment Details Table
      const tableData = payments.map((payment, index) => [
        index + 1,
        format(new Date(payment.bank_advice_generated_at || payment.period_end), 'dd/MM/yyyy'),
        `${format(new Date(payment.period_start), 'dd/MM/yy')} - ${format(new Date(payment.period_end), 'dd/MM/yy')}`,
        formatCurrency(payment.gross_amount || 0),
        formatCurrency(payment.tds_amount || 0),
        formatCurrency(payment.net_amount || 0)
      ]);

      (pdf as any).autoTable({
        startY: 136,
        head: [['#', 'Payment Date', 'Period', 'Gross Amount', 'TDS @ 10%', 'Net Amount']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' }
        }
      });

      const finalY = (pdf as any).lastAutoTable.finalY;
      
      // Summary
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary:', 20, finalY + 15);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Total Gross Amount: ${formatCurrency(totalGross)}`, 20, finalY + 22);
      pdf.text(`Total TDS Deducted: ${formatCurrency(totalTDS)}`, 20, finalY + 28);
      pdf.text(`Total Net Amount Paid: ${formatCurrency(totalNet)}`, 20, finalY + 34);
      
      // Declaration
      pdf.setFontSize(9);
      pdf.text('This is to certify that tax has been deducted at source as per the Income Tax Act, 1961.', 20, finalY + 45, { maxWidth: 170 });
      
      // Signature
      pdf.setFontSize(10);
      pdf.text('Authorized Signatory', 150, finalY + 60);
      pdf.text(websiteSettings?.hospital_name || 'WestMed Hospital', 150, finalY + 66);
      
      // Save to database
      const { error: dbError } = await supabase
        .from('tds_certificates')
        .insert([{
          certificate_number: certificateNumber,
          doctor_id: selectedDoctor,
          financial_year: selectedFY,
          quarter: selectedQuarter,
          period_start: format(startDate, 'yyyy-MM-dd'),
          period_end: format(endDate, 'yyyy-MM-dd'),
          total_gross_amount: totalGross,
          total_tds_amount: totalTDS,
          total_net_amount: totalNet,
          payment_ids: payments.map(p => p.id),
          generated_by: user?.id
        }]);

      if (dbError) throw dbError;

      // Download PDF
      pdf.save(`TDS_Certificate_${certificateNumber.replace(/\//g, '_')}.pdf`);
      
      toast({
        title: 'Certificate Generated',
        description: `TDS Certificate ${certificateNumber} has been generated successfully`
      });

      // Refresh certificates list
      fetchExistingCertificates();
      setPayments([]);
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate TDS certificate'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate TDS Certificate
          </CardTitle>
          <CardDescription>
            Generate TDS certificates for doctor payments (Form 16A style)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(doctor => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.doctor_code} - {doctor.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Financial Year</Label>
              <Select value={selectedFY} onValueChange={setSelectedFY}>
                <SelectTrigger>
                  <SelectValue placeholder="Select FY" />
                </SelectTrigger>
                <SelectContent>
                  {getFinancialYearOptions().map(fy => (
                    <SelectItem key={fy} value={fy}>
                      {fy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quarter</Label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quarter" />
                </SelectTrigger>
                <SelectContent>
                  {getQuarterOptions().map(q => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={fetchPaymentsForPeriod} 
            disabled={!selectedDoctor || !selectedFY || !selectedQuarter || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Payments...
              </>
            ) : (
              'Load Payments'
            )}
          </Button>

          {payments.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 bg-muted/50">
                <h3 className="font-semibold mb-2">Payment Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Payments:</span>
                    <span className="font-medium">{payments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Gross Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(payments.reduce((sum, p) => sum + (p.gross_amount || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total TDS (10%):</span>
                    <span className="font-medium text-destructive">
                      {formatCurrency(payments.reduce((sum, p) => sum + (p.tds_amount || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Net Amount:</span>
                    <span className="font-semibold text-success">
                      {formatCurrency(payments.reduce((sum, p) => sum + (p.net_amount || 0), 0))}
                    </span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={generateCertificate} 
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Certificate...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate & Download Certificate
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Certificates */}
      {existingCertificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previously Generated Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingCertificates.map(cert => (
                <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{cert.certificate_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {cert.financial_year} - {cert.quarter} | {formatCurrency(cert.total_net_amount)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(cert.generated_at), 'dd MMM yyyy')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
