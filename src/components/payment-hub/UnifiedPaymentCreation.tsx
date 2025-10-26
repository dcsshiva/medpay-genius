import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Wallet, Building2, Zap, Search, Calendar, FileCheck, Loader2 } from 'lucide-react';

interface UnifiedPaymentCreationProps {
  onPaymentCreated?: () => void;
}

interface PaymentItem {
  id: string;
  type: 'cash' | 'insurance' | 'quick';
  beneficiary_id?: string;
  beneficiary_name: string;
  beneficiary_code?: string;
  amount: number;
  date: string;
  reference: string;
  is_processed?: boolean;
}

const UnifiedPaymentCreation = ({ onPaymentCreated }: UnifiedPaymentCreationProps) => {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['cash', 'insurance', 'quick']));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const handleTypeToggle = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  const fetchPaymentItems = async () => {
    if (selectedTypes.size === 0) {
      toast.error('Please select at least one payment type');
      return;
    }

    if (!dateFrom || !dateTo) {
      toast.error('Please select date range');
      return;
    }

    try {
      setLoading(true);
      const allItems: PaymentItem[] = [];

      // Fetch cash visits
      if (selectedTypes.has('cash')) {
        const { data: cashVisits, error: cashError } = await supabase
          .from('visits')
          .select(`
            id,
            visit_code,
            visit_date,
            visit_payment,
            doctor_id,
            doctors!inner(doctor_code, full_name),
            is_processed
          `)
          .eq('payment_type', 'cash')
          .eq('is_processed', false)
          .gte('visit_date', dateFrom)
          .lte('visit_date', dateTo)
          .order('visit_date', { ascending: false });

        if (cashError) throw cashError;

        cashVisits?.forEach((visit: any) => {
          allItems.push({
            id: visit.id,
            type: 'cash',
            beneficiary_id: visit.doctor_id,
            beneficiary_name: visit.doctors?.full_name || 'Unknown Doctor',
            beneficiary_code: visit.doctors?.doctor_code,
            amount: Number(visit.visit_payment) || 0,
            date: visit.visit_date,
            reference: visit.visit_code,
            is_processed: visit.is_processed
          });
        });
      }

      // Fetch insurance visits
      if (selectedTypes.has('insurance')) {
        const { data: insuranceVisits, error: insuranceError } = await supabase
          .from('visits')
          .select(`
            id,
            visit_code,
            visit_date,
            visit_payment,
            doctor_id,
            doctors!inner(doctor_code, full_name),
            is_processed
          `)
          .eq('payment_type', 'insurance')
          .eq('is_processed', false)
          .gte('visit_date', dateFrom)
          .lte('visit_date', dateTo)
          .order('visit_date', { ascending: false });

        if (insuranceError) throw insuranceError;

        insuranceVisits?.forEach((visit: any) => {
          allItems.push({
            id: visit.id,
            type: 'insurance',
            beneficiary_id: visit.doctor_id,
            beneficiary_name: visit.doctors?.full_name || 'Unknown Doctor',
            beneficiary_code: visit.doctors?.doctor_code,
            amount: Number(visit.visit_payment) || 0,
            date: visit.visit_date,
            reference: visit.visit_code,
            is_processed: visit.is_processed
          });
        });
      }

      // Fetch quick payments
      if (selectedTypes.has('quick')) {
        const { data: quickPayments, error: quickError } = await supabase
          .from('quick_payments')
          .select('*')
          .eq('bank_advice_generated', false)
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo + 'T23:59:59')
          .order('created_at', { ascending: false });

        if (quickError) throw quickError;

        quickPayments?.forEach((payment: any) => {
          allItems.push({
            id: payment.id,
            type: 'quick',
            beneficiary_name: payment.name,
            amount: Number(payment.net_amount) || 0,
            date: format(new Date(payment.created_at), 'yyyy-MM-dd'),
            reference: payment.mobile_number
          });
        });
      }

      setItems(allItems);
      
      if (allItems.length === 0) {
        toast.info('No unprocessed payments found in the selected date range');
      } else {
        toast.success(`Found ${allItems.length} unprocessed payment items`);
      }
    } catch (error: any) {
      console.error('Error fetching payment items:', error);
      toast.error('Failed to fetch payment items');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const filteredIds = filteredItems.map(item => item.id);
    setSelectedItems(new Set(filteredIds));
  };

  const handleClearAll = () => {
    setSelectedItems(new Set());
  };

  const handleToggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const createPaymentAdvices = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one item');
      return;
    }

    try {
      setCreating(true);
      const selectedPayments = items.filter(item => selectedItems.has(item.id));

      // Group visits by doctor for cash and insurance
      const visitsByDoctor = new Map<string, PaymentItem[]>();
      const quickPaymentsList: PaymentItem[] = [];

      selectedPayments.forEach(item => {
        if (item.type === 'quick') {
          quickPaymentsList.push(item);
        } else if (item.beneficiary_id) {
          const existing = visitsByDoctor.get(item.beneficiary_id) || [];
          existing.push(item);
          visitsByDoctor.set(item.beneficiary_id, existing);
        }
      });

      let createdCount = 0;

      // Create payment advices for doctors
      for (const [doctorId, doctorVisits] of visitsByDoctor.entries()) {
        const visitDates = doctorVisits.map(v => new Date(v.date).getTime());
        const totalAmount = doctorVisits.reduce((sum, v) => sum + v.amount, 0);
        const grossAmount = totalAmount;
        const tdsAmount = grossAmount * 0.10;
        const netAmount = grossAmount - tdsAmount;

        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            doctor_id: doctorId,
            period_start: format(new Date(Math.min(...visitDates)), 'yyyy-MM-dd'),
            period_end: format(new Date(Math.max(...visitDates)), 'yyyy-MM-dd'),
            total_visits: doctorVisits.length,
            total_amount: totalAmount,
            gross_amount: grossAmount,
            tds_amount: tdsAmount,
            tds_percentage: 10.0,
            net_amount: netAmount,
            remaining_amount: netAmount,
            status: 'pending'
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Link visits to payment
        const visitLinks = doctorVisits.map(v => ({
          payment_id: payment.id,
          visit_id: v.id
        }));

        const { error: linkError } = await supabase
          .from('payment_visits')
          .insert(visitLinks);

        if (linkError) throw linkError;

        createdCount++;
      }

      // Note: Quick payments are already in the system, just need bank advice generation
      // which is handled in the bank advice generation component

      toast.success(`Created ${createdCount} payment advice(s) successfully`);
      
      // Reset selections and refresh
      setSelectedItems(new Set());
      setItems([]);
      onPaymentCreated?.();
      
    } catch (error: any) {
      console.error('Error creating payment advices:', error);
      toast.error('Failed to create payment advices');
    } finally {
      setCreating(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.beneficiary_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.beneficiary_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedTotal = items
    .filter(item => selectedItems.has(item.id))
    .reduce((sum, item) => sum + item.amount, 0);

  const selectedByType = {
    cash: items.filter(item => selectedItems.has(item.id) && item.type === 'cash').length,
    insurance: items.filter(item => selectedItems.has(item.id) && item.type === 'insurance').length,
    quick: items.filter(item => selectedItems.has(item.id) && item.type === 'quick').length
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select Payment Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Step 1: Select Payment Types
          </CardTitle>
          <CardDescription>Choose which payment types to include</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="cash" 
                checked={selectedTypes.has('cash')}
                onCheckedChange={() => handleTypeToggle('cash')}
              />
              <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                <Wallet className="h-4 w-4 text-green-600" />
                Cash Visits
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="insurance" 
                checked={selectedTypes.has('insurance')}
                onCheckedChange={() => handleTypeToggle('insurance')}
              />
              <Label htmlFor="insurance" className="flex items-center gap-2 cursor-pointer">
                <Building2 className="h-4 w-4 text-blue-600" />
                Insurance Visits
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="quick" 
                checked={selectedTypes.has('quick')}
                onCheckedChange={() => handleTypeToggle('quick')}
              />
              <Label htmlFor="quick" className="flex items-center gap-2 cursor-pointer">
                <Zap className="h-4 w-4 text-orange-600" />
                Quick Payments
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Date Range */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Step 2: Select Date Range
          </CardTitle>
          <CardDescription>Filter payments by date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="dateFrom">From Date</Label>
              <Input 
                id="dateFrom"
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="dateTo">To Date</Label>
              <Input 
                id="dateTo"
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button onClick={fetchPaymentItems} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Search className="h-4 w-4 mr-2" />
              Load Payments
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Review & Select */}
      {items.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Review & Select Items</CardTitle>
              <CardDescription>
                Found {items.length} unprocessed items. Select items to create payment advices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search & Actions */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex-1 min-w-[200px]">
                    <Input 
                      placeholder="Search by name, code, or reference..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                      Select All ({filteredItems.length})
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearAll}>
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* Selection Summary */}
                {selectedItems.size > 0 && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="pt-4">
                      <div className="flex flex-wrap items-center gap-4 justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {selectedItems.size} items selected
                          </p>
                          <div className="flex gap-2">
                            {selectedByType.cash > 0 && (
                              <Badge variant="secondary">{selectedByType.cash} Cash</Badge>
                            )}
                            {selectedByType.insurance > 0 && (
                              <Badge variant="secondary">{selectedByType.insurance} Insurance</Badge>
                            )}
                            {selectedByType.quick > 0 && (
                              <Badge variant="secondary">{selectedByType.quick} Quick</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Amount</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(selectedTotal)}
                          </p>
                        </div>
                        <Button 
                          onClick={createPaymentAdvices} 
                          disabled={creating}
                          size="lg"
                        >
                          {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Create Payment Advices
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Separator />

                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Beneficiary</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={() => handleToggleItem(item.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                item.type === 'cash' ? 'default' : 
                                item.type === 'insurance' ? 'secondary' : 
                                'outline'
                              }
                            >
                              {item.type === 'cash' && <Wallet className="h-3 w-3 mr-1" />}
                              {item.type === 'insurance' && <Building2 className="h-3 w-3 mr-1" />}
                              {item.type === 'quick' && <Zap className="h-3 w-3 mr-1" />}
                              {item.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.beneficiary_name}</p>
                              {item.beneficiary_code && (
                                <p className="text-xs text-muted-foreground">{item.beneficiary_code}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{item.reference}</TableCell>
                          <TableCell>{format(new Date(item.date), 'dd-MMM-yyyy')}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default UnifiedPaymentCreation;
