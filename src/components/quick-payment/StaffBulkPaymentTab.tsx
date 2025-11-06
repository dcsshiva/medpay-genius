import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, ArrowUpDown, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { validateIFSCCode } from '@/lib/validators';
import { formatCurrency } from '@/lib/currency';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface StaffForPayment {
  id: string;
  staff_code: string;
  full_name: string;
  bank_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  account_holder_name: string | null;
  user_id: string | null;
  has_payment_today: boolean;
}

interface StaffBankDetails {
  bank_name: string;
  bank_account_number: string;
  ifsc_code: string;
  branch_name: string;
  account_holder_name: string;
}

type SortField = 'staff_code' | 'full_name';
type SortDirection = 'asc' | 'desc';

export const StaffBulkPaymentTab = () => {
  const { user } = useAuth();
  const { data: websiteSettings } = useWebsiteSettings();
  const [staffList, setStaffList] = useState<StaffForPayment[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [staffPaymentAmounts, setStaffPaymentAmounts] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<SortField>('staff_code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedPaymentDate, setSelectedPaymentDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Bank details edit dialog
  const [editBankDialogOpen, setEditBankDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffForPayment | null>(null);
  const [editBankDetails, setEditBankDetails] = useState<StaffBankDetails>({
    bank_name: '',
    bank_account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_holder_name: '',
  });

  useEffect(() => {
    fetchStaffForPayment();
  }, [selectedPaymentDate]);

  const fetchStaffForPayment = async () => {
    try {
      const dateStr = format(selectedPaymentDate, 'yyyy-MM-dd');
      
      // Fetch active staff
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, staff_code, full_name, bank_name, bank_account_number, ifsc_code, branch_name, account_holder_name, user_id')
        .eq('is_active', true);

      if (staffError) throw staffError;

      // Check for existing payments on selected date
      const { data: paymentData, error: paymentError } = await supabase
        .from('staff_payments')
        .select('staff_id')
        .eq('payment_date', dateStr);

      if (paymentError) throw paymentError;

      const paidStaffIds = new Set(paymentData?.map(p => p.staff_id) || []);

      const staffWithPaymentStatus: StaffForPayment[] = (staffData || []).map(staff => ({
        ...staff,
        has_payment_today: paidStaffIds.has(staff.id),
      }));

      setStaffList(staffWithPaymentStatus);
    } catch (error: any) {
      toast.error('Failed to fetch staff list');
      console.error('Error:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
  };

  const sortedStaff = [...staffList].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (aValue > bValue ? 1 : -1) * multiplier;
  });

  const filteredStaff = sortedStaff.filter(staff => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return staff.staff_code.toLowerCase().includes(term) ||
           staff.full_name.toLowerCase().includes(term);
  });

  const handleStaffSelection = (staffId: string, checked: boolean) => {
    if (checked) {
      setSelectedStaff(prev => [...prev, staffId]);
    } else {
      setSelectedStaff(prev => prev.filter(id => id !== staffId));
      // Clear amount when deselected
      setStaffPaymentAmounts(prev => {
        const newAmounts = { ...prev };
        delete newAmounts[staffId];
        return newAmounts;
      });
    }
  };

  const handleSelectAll = () => {
    const validStaff = filteredStaff.filter(s => !s.has_payment_today && hasValidBankDetails(s));
    const allSelected = validStaff.every(s => selectedStaff.includes(s.id));
    
    if (allSelected) {
      setSelectedStaff([]);
      setStaffPaymentAmounts({});
    } else {
      setSelectedStaff(validStaff.map(s => s.id));
    }
  };

  const handleAmountChange = (staffId: string, value: string) => {
    // Only allow integers
    const intValue = value.replace(/\D/g, '');
    setStaffPaymentAmounts(prev => ({
      ...prev,
      [staffId]: intValue,
    }));
  };

  const hasValidBankDetails = (staff: StaffForPayment) => {
    return !!(staff.bank_name && staff.bank_account_number && staff.ifsc_code && 
              staff.branch_name && staff.account_holder_name);
  };

  const openEditBankDialog = (staff: StaffForPayment) => {
    setEditingStaff(staff);
    setEditBankDetails({
      bank_name: staff.bank_name || '',
      bank_account_number: staff.bank_account_number || '',
      ifsc_code: staff.ifsc_code || '',
      branch_name: staff.branch_name || '',
      account_holder_name: staff.account_holder_name || '',
    });
    setEditBankDialogOpen(true);
  };

  const handleSaveBankDetails = async () => {
    if (!editingStaff) return;

    if (!validateIFSCCode(editBankDetails.ifsc_code)) {
      toast.error('Invalid IFSC code format');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('staff')
        .update(editBankDetails)
        .eq('id', editingStaff.id);

      if (error) throw error;

      toast.success('Bank details updated successfully');
      setEditBankDialogOpen(false);
      fetchStaffForPayment();
    } catch (error: any) {
      toast.error('Failed to update bank details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateStaffBankAdvice = async () => {
    // Helper to sanitize GEFU fields
    const sanitizeGEFUField = (val: unknown): string => {
      return String(val ?? '')
        .replace(/[\r\n]+/g, ' ')
        .replace(/~/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const validSelections = selectedStaff.filter(staffId => {
      const amount = parseInt(staffPaymentAmounts[staffId] || '0');
      const staff = staffList.find(s => s.id === staffId);
      return amount > 0 && staff && hasValidBankDetails(staff);
    });

    if (validSelections.length === 0) {
      toast.error('Please select staff with valid amounts and bank details');
      return;
    }

    try {
      setLoading(true);

      // Create staff payment records
      const paymentRecords = validSelections.map(staffId => {
        const staff = staffList.find(s => s.id === staffId)!;
        const amount = parseInt(staffPaymentAmounts[staffId]);
        return {
          staff_id: staffId,
          payment_date: format(selectedPaymentDate, 'yyyy-MM-dd'),
          amount: amount,
          bank_name: staff.bank_name,
          account_number: staff.bank_account_number,
          ifsc_code: staff.ifsc_code,
          branch_name: staff.branch_name,
          account_holder_name: staff.account_holder_name,
          bank_advice_generated: true,
          bank_advice_generated_at: new Date().toISOString(),
          bank_advice_generated_by: user?.id,
          created_by: user?.id,
        };
      });

      const { data: insertedPayments, error: insertError } = await supabase
        .from('staff_payments')
        .insert(paymentRecords)
        .select();

      if (insertError) throw insertError;

      // Generate GEFU format file
      const totalAmount = validSelections.reduce((sum, staffId) => {
        return sum + parseInt(staffPaymentAmounts[staffId]);
      }, 0);

      const dateStr = `${String(selectedPaymentDate.getDate()).padStart(2, '0')}/${String(selectedPaymentDate.getMonth() + 1).padStart(2, '0')}/${selectedPaymentDate.getFullYear()}`;
      
      const hospAcc = sanitizeGEFUField(websiteSettings?.hospital_bank_account_number || '120000794291');
      const hospName = sanitizeGEFUField(websiteSettings?.hospital_bank_account_holder_name || 'WESTMED HEALTHCARE PRIVATE LIMITED');
      const hospCode = sanitizeGEFUField(websiteSettings?.hospital_institution_code || 'ABC07112007');

      let fileContent = `H~${dateStr}~${hospCode}\n`;

      validSelections.forEach((staffId, index) => {
        const staff = staffList.find(s => s.id === staffId)!;
        const amount = parseInt(staffPaymentAmounts[staffId]);
        
        const detailLine = [
          'D',
          'N06',
          hospAcc,
          hospName,
          sanitizeGEFUField('ADDRESS1'),
          sanitizeGEFUField('ADDRESS2'),
          sanitizeGEFUField('ADDRESS3'),
          sanitizeGEFUField(staff.ifsc_code),
          sanitizeGEFUField(staff.bank_account_number),
          sanitizeGEFUField(staff.account_holder_name || staff.full_name),
          '', '', '', '',
          (index + 1).toString(),
          dateStr,
          amount.toFixed(2),
          (index + 1).toString(),
          '', '', '', ''
        ].join('~');
        
        fileContent += detailLine + '\n';
      });

      fileContent += `F~${validSelections.length}~${totalAmount.toFixed(2)}`;

      const filenameDateStr = format(selectedPaymentDate, 'ddMMyy');
      const filename = `STAFF-${filenameDateStr}-${validSelections.length}.txt`;

      // Update payment records with bank advice reference
      const { error: updateError } = await supabase
        .from('staff_payments')
        .update({ bank_advice_reference: filename })
        .in('id', insertedPayments!.map(p => p.id));

      if (updateError) throw updateError;

      // Save to history
      await supabase.from('staff_payment_bank_advice_history').insert({
        filename: filename,
        generation_date: format(selectedPaymentDate, 'yyyy-MM-dd'),
        payment_count: validSelections.length,
        total_amount: totalAmount,
        payment_ids: insertedPayments!.map(p => p.id),
        file_content: fileContent,
        generated_by: user?.id,
      });

      // Download file
      const blob = new Blob([fileContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded ${filename}`, {
        description: `Bank advice generated for ${validSelections.length} staff member(s)`
      });

      // Reset selections
      setSelectedStaff([]);
      setStaffPaymentAmounts({});
      fetchStaffForPayment();
    } catch (error: any) {
      toast.error('Failed to generate bank advice');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedAmount = selectedStaff.reduce((sum, staffId) => {
    return sum + parseInt(staffPaymentAmounts[staffId] || '0');
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <Label>Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(selectedPaymentDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedPaymentDate}
                  onSelect={(date) => date && setSelectedPaymentDate(date)}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1">
            <Label>Search Staff</Label>
            <Input
              placeholder="Search by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-[300px]"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSelectAll}>
            {selectedStaff.length === filteredStaff.filter(s => !s.has_payment_today && hasValidBankDetails(s)).length
              ? 'Deselect All'
              : 'Select All Valid'}
          </Button>
          <Button 
            onClick={generateStaffBankAdvice}
            disabled={selectedStaff.length === 0 || loading}
          >
            Generate Bank Advice ({selectedStaff.length})
          </Button>
        </div>
      </div>

      {selectedStaff.length > 0 && (
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm font-medium">
            Selected: {selectedStaff.length} staff | Total Amount: {formatCurrency(totalSelectedAmount)}
          </p>
        </div>
      )}

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Select</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('staff_code')} className="h-8 p-0">
                  Staff Code {getSortIcon('staff_code')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('full_name')} className="h-8 p-0">
                  Full Name {getSortIcon('full_name')}
                </Button>
              </TableHead>
              <TableHead>Bank Details</TableHead>
              <TableHead className="w-[150px]">Amount</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.map((staff) => {
              const isDisabled = staff.has_payment_today;
              const hasBank = hasValidBankDetails(staff);
              const isSelected = selectedStaff.includes(staff.id);

              return (
                <TableRow 
                  key={staff.id}
                  className={!hasBank ? 'bg-destructive/5' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleStaffSelection(staff.id, checked as boolean)}
                      disabled={isDisabled || !hasBank}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{staff.staff_code}</TableCell>
                  <TableCell>{staff.full_name}</TableCell>
                  <TableCell>
                    {hasBank ? (
                      <div className="text-sm">
                        <div>{staff.bank_name}</div>
                        <div className="text-muted-foreground">{staff.bank_account_number}</div>
                        <div className="text-muted-foreground">{staff.ifsc_code}</div>
                      </div>
                    ) : (
                      <span className="text-destructive text-sm">Missing bank details</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      placeholder="0"
                      value={staffPaymentAmounts[staff.id] || ''}
                      onChange={(e) => handleAmountChange(staff.id, e.target.value)}
                      disabled={!isSelected}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditBankDialog(staff)}
                      disabled={isDisabled}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Bank Details Edit Dialog */}
      <Dialog open={editBankDialogOpen} onOpenChange={setEditBankDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bank Details - {editingStaff?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Bank Name *</Label>
              <Input
                value={editBankDetails.bank_name}
                onChange={(e) => setEditBankDetails(prev => ({ ...prev, bank_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Account Holder Name *</Label>
              <Input
                value={editBankDetails.account_holder_name}
                onChange={(e) => setEditBankDetails(prev => ({ ...prev, account_holder_name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Account Number *</Label>
              <Input
                value={editBankDetails.bank_account_number}
                onChange={(e) => setEditBankDetails(prev => ({ ...prev, bank_account_number: e.target.value }))}
              />
            </div>
            <div>
              <Label>IFSC Code *</Label>
              <Input
                value={editBankDetails.ifsc_code}
                onChange={(e) => setEditBankDetails(prev => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <Label>Branch Name *</Label>
              <Input
                value={editBankDetails.branch_name}
                onChange={(e) => setEditBankDetails(prev => ({ ...prev, branch_name: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBankDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBankDetails} disabled={loading}>
              Save & Update Staff Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
