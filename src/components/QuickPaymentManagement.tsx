import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Eye, Download } from 'lucide-react';
import { validateMobileNumber, formatMobileNumber } from '@/lib/validators';
import { formatCurrency } from '@/lib/currency';
import { useAuth } from '@/lib/auth';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface QuickPaymentType {
  id: string;
  type_name: string;
}

interface QuickPayment {
  id: string;
  name: string;
  mobile_number: string;
  payment_type_id: string;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  account_holder_name: string | null;
  gross_amount: number;
  tds_percentage: number;
  tds_amount: number;
  net_amount: number;
  payment_notes: string | null;
  bank_advice_generated: boolean;
  bank_advice_reference: string | null;
  created_at: string;
  quick_payment_types: { type_name: string };
}

const QuickPaymentManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('add-payment');
  const [types, setTypes] = useState<QuickPaymentType[]>([]);
  const [payments, setPayments] = useState<QuickPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<QuickPayment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    mobile_number: '',
    payment_type_id: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_holder_name: '',
    gross_amount: '',
    tds_percentage: '0',
    payment_notes: '',
  });

  useEffect(() => {
    fetchTypes();
    fetchPayments();
  }, []);

  // Calculate TDS and net amount when gross amount or TDS percentage changes
  useEffect(() => {
    const gross = parseFloat(formData.gross_amount) || 0;
    const tdsRate = parseFloat(formData.tds_percentage) || 0;
    const tdsAmount = (gross * tdsRate) / 100;
    const netAmount = gross - tdsAmount;
    
    // Store in hidden fields (we'll handle this in submit)
  }, [formData.gross_amount, formData.tds_percentage]);

  const fetchTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_payment_types')
        .select('id, type_name')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setTypes(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch payment types');
      console.error('Error:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_payments')
        .select(`
          *,
          quick_payment_types (type_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch payments');
      console.error('Error:', error);
    }
  };

  const calculateTDS = (grossAmount: number, tdsPercentage: number) => {
    const tdsAmount = (grossAmount * tdsPercentage) / 100;
    const netAmount = grossAmount - tdsAmount;
    return { tdsAmount, netAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateMobileNumber(formData.mobile_number)) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }

    const grossAmount = parseFloat(formData.gross_amount) || 0;
    const tdsPercentage = parseFloat(formData.tds_percentage) || 0;
    const { tdsAmount, netAmount } = calculateTDS(grossAmount, tdsPercentage);

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quick_payments')
        .insert([{
          ...formData,
          gross_amount: grossAmount,
          tds_percentage: tdsPercentage,
          tds_amount: tdsAmount,
          net_amount: netAmount,
          created_by: user?.id,
        }]);

      if (error) throw error;
      
      toast.success('Quick payment added successfully');
      resetForm();
      setActiveTab('review');
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add payment');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPayment) return;
    
    if (!validateMobileNumber(formData.mobile_number)) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }

    const grossAmount = parseFloat(formData.gross_amount) || 0;
    const tdsPercentage = parseFloat(formData.tds_percentage) || 0;
    const { tdsAmount, netAmount } = calculateTDS(grossAmount, tdsPercentage);

    setLoading(true);
    try {
      const { error } = await supabase
        .from('quick_payments')
        .update({
          ...formData,
          gross_amount: grossAmount,
          tds_percentage: tdsPercentage,
          tds_amount: tdsAmount,
          net_amount: netAmount,
        })
        .eq('id', selectedPayment.id);

      if (error) throw error;
      
      toast.success('Payment updated successfully');
      setEditDialogOpen(false);
      resetForm();
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update payment');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      const { error } = await supabase
        .from('quick_payments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Payment deleted successfully');
      fetchPayments();
    } catch (error: any) {
      toast.error('Failed to delete payment');
      console.error('Error:', error);
    }
  };

  const generateBankAdvice = async () => {
    if (selectedPayments.length === 0) {
      toast.error('Please select at least one payment');
      return;
    }

    const paymentsToGenerate = payments.filter(p => 
      selectedPayments.includes(p.id) && !p.bank_advice_generated
    );

    if (paymentsToGenerate.length === 0) {
      toast.error('No valid payments selected');
      return;
    }

    try {
      // Create Excel file
      const workbook = XLSX.utils.book_new();
      
      const excelData = paymentsToGenerate.map(payment => ({
        'Payee Name': payment.name,
        'Mobile Number': payment.mobile_number,
        'Type': payment.quick_payment_types.type_name,
        'Bank Name': payment.bank_name || 'N/A',
        'Account Number': payment.account_number || 'N/A',
        'IFSC Code': payment.ifsc_code || 'N/A',
        'Account Holder': payment.account_holder_name || payment.name,
        'Gross Amount': payment.gross_amount,
        'TDS %': payment.tds_percentage,
        'TDS Amount': payment.tds_amount,
        'Net Amount': payment.net_amount,
        'Notes': payment.payment_notes || '',
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Quick Payments');
      
      // Generate filename
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const filename = `QuickPayment_BankAdvice_${timestamp}.xlsx`;
      
      // Download file
      XLSX.writeFile(workbook, filename);
      
      // Calculate totals
      const totalGross = paymentsToGenerate.reduce((sum, p) => sum + p.gross_amount, 0);
      const totalTDS = paymentsToGenerate.reduce((sum, p) => sum + p.tds_amount, 0);
      const totalNet = paymentsToGenerate.reduce((sum, p) => sum + p.net_amount, 0);
      
      // Save to history
      const { error: historyError } = await supabase
        .from('quick_payment_bank_advice_history')
        .insert({
          filename,
          payment_count: paymentsToGenerate.length,
          total_gross_amount: totalGross,
          total_tds_amount: totalTDS,
          total_net_amount: totalNet,
          payment_ids: paymentsToGenerate.map(p => p.id),
          generated_by: user?.id,
        });
      
      if (historyError) throw historyError;
      
      // Update payments as generated
      const { error: updateError } = await supabase
        .from('quick_payments')
        .update({
          bank_advice_generated: true,
          bank_advice_generated_at: new Date().toISOString(),
          bank_advice_generated_by: user?.id,
          bank_advice_reference: filename,
        })
        .in('id', paymentsToGenerate.map(p => p.id));
      
      if (updateError) throw updateError;
      
      toast.success(`Bank advice generated for ${paymentsToGenerate.length} payments`);
      setSelectedPayments([]);
      fetchPayments();
    } catch (error: any) {
      toast.error('Failed to generate bank advice');
      console.error('Error:', error);
    }
  };

  const openEditDialog = (payment: QuickPayment) => {
    setSelectedPayment(payment);
    setFormData({
      name: payment.name,
      mobile_number: payment.mobile_number,
      payment_type_id: payment.payment_type_id,
      bank_name: payment.bank_name || '',
      account_number: payment.account_number || '',
      ifsc_code: payment.ifsc_code || '',
      branch_name: payment.branch_name || '',
      account_holder_name: payment.account_holder_name || '',
      gross_amount: payment.gross_amount.toString(),
      tds_percentage: payment.tds_percentage.toString(),
      payment_notes: payment.payment_notes || '',
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      mobile_number: '',
      payment_type_id: '',
      bank_name: '',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      account_holder_name: '',
      gross_amount: '',
      tds_percentage: '0',
      payment_notes: '',
    });
    setSelectedPayment(null);
  };

  const pendingPayments = payments.filter(p => !p.bank_advice_generated);
  const generatedPayments = payments.filter(p => p.bank_advice_generated);

  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.net_amount, 0);
  const generatedTotal = generatedPayments.reduce((sum, p) => sum + p.net_amount, 0);

  // Form validation function
  const isFormValid = () => {
    const hasName = formData.name.trim().length > 0;
    const hasMobile = validateMobileNumber(formData.mobile_number);
    const hasType = formData.payment_type_id.length > 0;
    const hasGrossAmount = parseFloat(formData.gross_amount) > 0;
    
    // All bank details are now required
    const hasBankName = formData.bank_name.trim().length > 0;
    const hasAccountNumber = formData.account_number.trim().length > 0;
    const hasIFSC = formData.ifsc_code.trim().length > 0;
    const hasBranchName = formData.branch_name.trim().length > 0;
    const hasAccountHolder = formData.account_holder_name.trim().length > 0;
    
    return hasName && hasMobile && hasType && hasGrossAmount && 
           hasBankName && hasAccountNumber && hasIFSC && hasBranchName && hasAccountHolder;
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Quick Payment Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="add-payment">Add Payment</TabsTrigger>
          <TabsTrigger value="review">Review & Generate</TabsTrigger>
        </TabsList>

        <TabsContent value="add-payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Quick Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobile_number">Mobile Number *</Label>
                    <Input
                      id="mobile_number"
                      value={formData.mobile_number}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        mobile_number: formatMobileNumber(e.target.value) 
                      })}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      required
                    />
                    {formData.mobile_number && !validateMobileNumber(formData.mobile_number) && (
                      <p className="text-sm text-destructive mt-1">
                        Mobile number must be exactly 10 digits
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment_type_id">Payment Type *</Label>
                    <Select
                      value={formData.payment_type_id}
                      onValueChange={(value) => setFormData({ ...formData, payment_type_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {types.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.type_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Amount and TDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gross_amount">Gross Amount *</Label>
                    <Input
                      id="gross_amount"
                      type="number"
                      step="0.01"
                      value={formData.gross_amount}
                      onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="tds_percentage">TDS Percentage (%)</Label>
                    <Input
                      id="tds_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.tds_percentage}
                      onChange={(e) => setFormData({ ...formData, tds_percentage: e.target.value })}
                      placeholder="Enter TDS %"
                    />
                  </div>
                </div>

                {/* TDS Calculation Display */}
                {formData.gross_amount && (
                  <Card className="bg-muted">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Gross Amount</p>
                          <p className="font-semibold">{formatCurrency(parseFloat(formData.gross_amount) || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">TDS Amount</p>
                          <p className="font-semibold">
                            {formatCurrency(calculateTDS(
                              parseFloat(formData.gross_amount) || 0,
                              parseFloat(formData.tds_percentage) || 0
                            ).tdsAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Net Amount</p>
                          <p className="font-semibold text-primary">
                            {formatCurrency(calculateTDS(
                              parseFloat(formData.gross_amount) || 0,
                              parseFloat(formData.tds_percentage) || 0
                            ).netAmount)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bank Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Bank Details *</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bank_name">Bank Name *</Label>
                      <Input
                        id="bank_name"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="Enter bank name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                      <Input
                        id="account_holder_name"
                        value={formData.account_holder_name}
                        onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                        placeholder="Enter account holder name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="account_number">Account Number *</Label>
                      <Input
                        id="account_number"
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        placeholder="Enter account number"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="ifsc_code">IFSC Code *</Label>
                      <Input
                        id="ifsc_code"
                        value={formData.ifsc_code}
                        onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                        placeholder="e.g., SBIN0001234"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="branch_name">Branch Name *</Label>
                    <Input
                      id="branch_name"
                      value={formData.branch_name}
                      onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                      placeholder="Enter branch name"
                      required
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="payment_notes">Payment Notes</Label>
                  <Textarea
                    id="payment_notes"
                    value={formData.payment_notes}
                    onChange={(e) => setFormData({ ...formData, payment_notes: e.target.value })}
                    placeholder="Optional notes"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex gap-4">
                    <Button type="submit" disabled={loading || !isFormValid()}>
                      {loading ? 'Saving...' : 'Submit Payment'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Clear Form
                    </Button>
                  </div>
                  {!isFormValid() && (
                    <p className="text-sm text-muted-foreground">
                      Please fill all required fields: Name, Mobile (10 digits), Payment Type, Gross Amount, and all Bank Details
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="mt-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingPayments.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(pendingTotal)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Generated Advices</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{generatedPayments.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Generated Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(generatedTotal)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Pending Payments */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Pending Payments</CardTitle>
                  <Button
                    onClick={generateBankAdvice}
                    disabled={selectedPayments.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Generate Bank Advice ({selectedPayments.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedPayments.length === pendingPayments.length && pendingPayments.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPayments(pendingPayments.map(p => p.id));
                            } else {
                              setSelectedPayments([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Gross Amount</TableHead>
                      <TableHead>TDS</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPayments.includes(payment.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPayments([...selectedPayments, payment.id]);
                              } else {
                                setSelectedPayments(selectedPayments.filter(id => id !== payment.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{payment.name}</TableCell>
                        <TableCell>{payment.mobile_number}</TableCell>
                        <TableCell>{payment.quick_payment_types.type_name}</TableCell>
                        <TableCell>{formatCurrency(payment.gross_amount)}</TableCell>
                        <TableCell>{payment.tds_percentage}%</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(payment.net_amount)}</TableCell>
                        <TableCell>{payment.bank_name || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditDialog(payment)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(payment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Generated Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Bank Advices</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Generated Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{payment.name}</TableCell>
                        <TableCell>{payment.mobile_number}</TableCell>
                        <TableCell>{payment.quick_payment_types.type_name}</TableCell>
                        <TableCell>{formatCurrency(payment.net_amount)}</TableCell>
                        <TableCell>{payment.bank_name || '-'}</TableCell>
                        <TableCell className="text-sm">{payment.bank_advice_reference}</TableCell>
                        <TableCell>{format(new Date(payment.created_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="font-medium">{selectedPayment.name}</p>
                </div>
                <div>
                  <Label>Mobile Number</Label>
                  <p className="font-medium">{selectedPayment.mobile_number}</p>
                </div>
                <div>
                  <Label>Payment Type</Label>
                  <p className="font-medium">{selectedPayment.quick_payment_types.type_name}</p>
                </div>
                <div>
                  <Label>Gross Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedPayment.gross_amount)}</p>
                </div>
                <div>
                  <Label>TDS Percentage</Label>
                  <p className="font-medium">{selectedPayment.tds_percentage}%</p>
                </div>
                <div>
                  <Label>TDS Amount</Label>
                  <p className="font-medium">{formatCurrency(selectedPayment.tds_amount)}</p>
                </div>
                <div>
                  <Label>Net Amount</Label>
                  <p className="font-medium text-primary">{formatCurrency(selectedPayment.net_amount)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Bank Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bank Name</Label>
                    <p>{selectedPayment.bank_name || '-'}</p>
                  </div>
                  <div>
                    <Label>Account Holder</Label>
                    <p>{selectedPayment.account_holder_name || '-'}</p>
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <p>{selectedPayment.account_number || '-'}</p>
                  </div>
                  <div>
                    <Label>IFSC Code</Label>
                    <p>{selectedPayment.ifsc_code || '-'}</p>
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <p>{selectedPayment.branch_name || '-'}</p>
                  </div>
                </div>
              </div>
              
              {selectedPayment.payment_notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedPayment.payment_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">Name *</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_mobile">Mobile Number *</Label>
                <Input
                  id="edit_mobile"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    mobile_number: formatMobileNumber(e.target.value) 
                  })}
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_type">Payment Type *</Label>
                <Select
                  value={formData.payment_type_id}
                  onValueChange={(value) => setFormData({ ...formData, payment_type_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.type_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_gross">Gross Amount *</Label>
                <Input
                  id="edit_gross"
                  type="number"
                  step="0.01"
                  value={formData.gross_amount}
                  onChange={(e) => setFormData({ ...formData, gross_amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_tds">TDS Percentage (%)</Label>
                <Input
                  id="edit_tds"
                  type="number"
                  step="0.01"
                  value={formData.tds_percentage}
                  onChange={(e) => setFormData({ ...formData, tds_percentage: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Payment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickPaymentManagement;
