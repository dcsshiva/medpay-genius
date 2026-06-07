import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Edit,
  Split,
  Trash2,
  AlertTriangle,
  History,
  CreditCard,
  Building2,
  ChevronDown,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Payment {
  id: string;
  period_start: string;
  period_end: string;
  discharge_date?: string;
  total_visits: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  is_fully_paid: boolean;
  payment_notes?: string;
  status: 'pending' | 'manager_approved' | 'admin_approved' | 'rejected';
  is_suspect?: boolean;
  suspect_reason?: string;
  bank_advice_generated?: boolean;
  gross_amount?: number;
  tds_amount?: number;
  tds_percentage?: number;
  net_amount?: number;
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
  cash_total?: number;
  cash_visits?: number;
  insurance_total?: number;
  insurance_visits?: number;
  cash_approval_status?: string;
  insurance_approval_status?: string;
  patient_names?: string[]; // Array of all patient names in this payment
  insurance_company_names?: string[]; // Array of unique insurance company names
  // Part payment fields
  total_released_gross?: number;
  total_released_tds?: number;
  total_released_net?: number;
  release_count?: number;
  release_status?: string;
}

interface PaymentManagementTableProps {
  payments: Payment[];
  userRole?: string;
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string) => void;
  onEdit?: (payment: Payment) => void;
  onDelete?: (paymentId: string) => void;
  onMarkSuspect?: (payment: Payment) => void;
  onRecordPayment?: (payment: Payment) => void;
  onViewTransactions?: (payment: Payment) => void;
  onPartPayment?: (payment: Payment) => void;
  onViewReleaseHistory?: (payment: Payment) => void;
  showBankAdviceCheckbox?: boolean;
  selectedPayments?: Set<string>;
  onSelectPayment?: (paymentId: string, checked: boolean) => void;
  showApprovalCheckbox?: boolean;
  selectedForApproval?: Set<string>;
  onSelectForApproval?: (paymentId: string, checked: boolean) => void;
  expandPatientsByDefault?: boolean;
}

const PaymentManagementTable: React.FC<PaymentManagementTableProps> = ({
  payments,
  userRole,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onMarkSuspect,
  onRecordPayment,
  onViewTransactions,
  onPartPayment,
  onViewReleaseHistory,
  showBankAdviceCheckbox,
  selectedPayments,
  onSelectPayment,
  showApprovalCheckbox,
  selectedForApproval,
  onSelectForApproval,
  expandPatientsByDefault = false,
}) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'discharge_date', direction: 'asc' });
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Patient detail side-sheet state
  const [patientSheet, setPatientSheet] = useState<{
    open: boolean;
    patientName: string;
    doctorName: string;
    loading: boolean;
    visits: any[];
  }>({ open: false, patientName: '', doctorName: '', loading: false, visits: [] });

  const openPatientSheet = async (payment: Payment, patientName: string) => {
    setPatientSheet({
      open: true,
      patientName,
      doctorName: payment.doctors?.profiles?.full_name || 'Unknown',
      loading: true,
      visits: [],
    });
    try {
      const userId = userRole === 'doctor'
        ? ((user as any)?.user_metadata?.auth_user_id || user?.id)
        : user?.id;
      const { data, error } = await supabase.rpc('get_payment_visits', {
        _payment_id: payment.id,
        _user_id: userId,
      });
      if (error) throw error;
      const filtered = (data || []).filter(
        (v: any) => (v.patient_name || '').trim().toLowerCase() === patientName.trim().toLowerCase()
      );
      setPatientSheet((s) => ({ ...s, loading: false, visits: filtered }));
    } catch (e) {
      console.error('Error fetching patient visits:', e);
      setPatientSheet((s) => ({ ...s, loading: false, visits: [] }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'manager_approved': return <AlertCircle className="h-3 w-3" />;
      case 'admin_approved': return <CheckCircle className="h-3 w-3" />;
      case 'rejected': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = 
      status === 'pending' ? 'secondary' :
      status === 'manager_approved' ? 'outline' :
      status === 'admin_approved' ? 'default' :
      'destructive';
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPayments = React.useMemo(() => {
    if (!sortConfig) return payments;

    return [...payments].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Payment];
      let bValue: any = b[sortConfig.key as keyof Payment];

      if (sortConfig.key === 'doctor_name') {
        aValue = a.doctors?.profiles?.full_name || '';
        bValue = b.doctors?.profiles?.full_name || '';
      }

      if (sortConfig.key === 'discharge_date') {
        aValue = a.discharge_date ? new Date(a.discharge_date).getTime() : 0;
        bValue = b.discharge_date ? new Date(b.discharge_date).getTime() : 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [payments, sortConfig]);

  const getMobileActions = (payment: Payment) => {
    const actions: { label: string; icon: React.ReactNode; onClick: () => void; variant?: string }[] = [];
    
    if (userRole !== 'doctor' && payment.status !== 'rejected') {
      if ((userRole === 'manager' && payment.status === 'pending') || 
          (userRole === 'admin' && (payment.status === 'pending' || payment.status === 'manager_approved'))) {
        actions.push({ label: 'Approve', icon: <CheckCircle className="h-4 w-4" />, onClick: () => onApprove(payment.id), variant: 'success' });
        actions.push({ label: 'Reject', icon: <X className="h-4 w-4" />, onClick: () => onReject(payment.id), variant: 'destructive' });
      }
      if (userRole === 'admin' && payment.status === 'pending') {
        if (onEdit) actions.push({ label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => onEdit(payment) });
        if (onDelete) actions.push({ label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => onDelete(payment.id), variant: 'destructive' });
      }
      if (onMarkSuspect) actions.push({ label: payment.is_suspect ? 'Remove Suspect' : 'Mark Suspect', icon: <AlertTriangle className="h-4 w-4" />, onClick: () => onMarkSuspect(payment) });
    }
    if (payment.status === 'admin_approved' && onRecordPayment) {
      actions.push({ label: 'Record Payment', icon: <CreditCard className="h-4 w-4" />, onClick: () => onRecordPayment(payment) });
    }
    if ((payment.status === 'admin_approved' || payment.cash_approval_status === 'approved' || payment.insurance_approval_status === 'approved') && 
        onPartPayment && payment.release_status !== 'fully_released') {
      actions.push({ label: 'Part Payment', icon: <Split className="h-4 w-4" />, onClick: () => onPartPayment(payment) });
    }
    if (payment.release_count && payment.release_count > 0 && onViewReleaseHistory) {
      actions.push({ label: `Releases (${payment.release_count})`, icon: <History className="h-4 w-4" />, onClick: () => onViewReleaseHistory(payment) });
    }
    if (onViewTransactions) {
      actions.push({ label: 'History', icon: <History className="h-4 w-4" />, onClick: () => onViewTransactions(payment) });
    }
    return actions;
  };

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {sortedPayments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No payments found</div>
        ) : (
          sortedPayments.map((payment) => {
            const isExpanded = expandedCards.has(payment.id);
            const actions = getMobileActions(payment);
            return (
              <Card key={payment.id} className={payment.is_suspect ? 'border-destructive/50 bg-destructive/5' : ''}>
                <CardContent className="p-4">
                  {/* Header: Doctor + Checkbox + Actions */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {showApprovalCheckbox && onSelectForApproval && (
                        <Checkbox
                          checked={selectedForApproval?.has(payment.id) || false}
                          onCheckedChange={(checked) => onSelectForApproval(payment.id, !!checked)}
                        />
                      )}
                      {showBankAdviceCheckbox && onSelectPayment && (
                        <Checkbox
                          checked={selectedPayments?.has(payment.id)}
                          onCheckedChange={(checked) => onSelectPayment(payment.id, checked as boolean)}
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{payment.doctors?.profiles?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{payment.doctors?.doctor_code}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {payment.is_suspect && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                          <AlertTriangle className="h-3 w-3 mr-0.5" />
                          SUSPECT
                        </Badge>
                      )}
                      {getStatusBadge(payment.status)}
                      {actions.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions.map((action, i) => (
                              <DropdownMenuItem key={i} onClick={action.onClick}>
                                {action.icon}
                                <span className="ml-2">{action.label}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Release status */}
                  {payment.release_status && payment.release_status !== 'not_started' && (
                    <Badge 
                      variant={payment.release_status === 'fully_released' ? 'default' : 'secondary'}
                      className="text-xs mb-2"
                    >
                      {payment.release_status === 'fully_released' ? 'Fully Released' : `Released ${payment.release_count || 0}x`}
                    </Badge>
                  )}

                  {/* Key Amounts Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-muted/50 rounded-md p-2 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase">Total</div>
                      <div className="text-sm font-bold text-primary">{formatCurrency(payment.total_amount)}</div>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase">Net</div>
                      <div className="text-sm font-bold text-success">{formatCurrency(payment.net_amount || (payment.gross_amount || payment.total_amount) * 0.90)}</div>
                    </div>
                    <div className="bg-muted/50 rounded-md p-2 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase">Remaining</div>
                      <div className="text-sm font-bold text-warning">
                        {formatCurrency(
                          payment.total_released_gross 
                            ? (payment.gross_amount || payment.total_amount) - payment.total_released_gross
                            : payment.paid_amount && payment.paid_amount > 0
                              ? (payment.gross_amount || payment.total_amount) - (payment.paid_amount / 0.9)
                              : (payment.gross_amount || payment.total_amount)
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <Collapsible open={isExpanded} onOpenChange={() => {
                    const next = new Set(expandedCards);
                    isExpanded ? next.delete(payment.id) : next.add(payment.id);
                    setExpandedCards(next);
                  }}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground">
                        <ChevronDown className={`h-3 w-3 mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        {isExpanded ? 'Less details' : 'More details'}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-2 text-xs border-t pt-2">
                        {payment.discharge_date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Discharge</span>
                            <span className="font-medium">{formatDateIST(payment.discharge_date)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gross</span>
                          <span className="font-medium">{formatCurrency(payment.gross_amount || payment.total_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">TDS (10%)</span>
                          <span className="font-medium text-destructive">-{formatCurrency(payment.tds_amount || (payment.gross_amount || payment.total_amount) * 0.10)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Net Paid</span>
                          <span className="font-medium text-success">{formatCurrency(payment.total_released_net || payment.paid_amount || 0)}</span>
                        </div>
                        {/* Payment Types */}
                        {((payment.cash_total ?? 0) > 0 || (payment.insurance_total ?? 0) > 0) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(payment.cash_total ?? 0) > 0 && (
                              <Badge variant="secondary" className="text-[10px]">Cash: {formatCurrency(payment.cash_total || 0)}</Badge>
                            )}
                            {(payment.insurance_total ?? 0) > 0 && (
                              <Badge variant="secondary" className="text-[10px]">Insurance: {formatCurrency(payment.insurance_total || 0)}</Badge>
                            )}
                          </div>
                        )}
                        {/* Patient Names */}
                        {payment.patient_names && payment.patient_names.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Patients: </span>
                            <span>{expandPatientsByDefault ? payment.patient_names.join(', ') : `${payment.patient_names.slice(0, 3).join(', ')}${payment.patient_names.length > 3 ? ` +${payment.patient_names.length - 3}` : ''}`}</span>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  }

  // Desktop Table View
  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            {showApprovalCheckbox && (
              <TableHead className="w-12">
                <Checkbox
                  checked={payments.length > 0 && payments.every(p => selectedForApproval?.has(p.id))}
                  onCheckedChange={(checked) => {
                    payments.forEach(p => onSelectForApproval?.(p.id, !!checked));
                  }}
                />
              </TableHead>
            )}
            {showBankAdviceCheckbox && (
              <TableHead className="w-12">Select</TableHead>
            )}
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('doctor_name')}
            >
              Doctor
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('discharge_date')}
            >
              Discharge Date
            </TableHead>
            <TableHead>Patient Names</TableHead>
            <TableHead className="text-center">Payment Types</TableHead>
            <TableHead 
              className="text-right cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('total_amount')}
            >
              Total Amount
            </TableHead>
            <TableHead className="text-right">Gross Amount</TableHead>
            <TableHead className="text-right">TDS (10%)</TableHead>
            <TableHead className="text-right">Net Payable</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPayments.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={(showApprovalCheckbox ? 1 : 0) + (showBankAdviceCheckbox ? 13 : 12)} 
                className="text-center text-muted-foreground py-8"
              >
                No payments found
              </TableCell>
            </TableRow>
          ) : (
            sortedPayments.map((payment) => (
              <React.Fragment key={payment.id}>
                <TableRow className={payment.is_suspect ? 'bg-destructive/5' : ''}>
                {showApprovalCheckbox && onSelectForApproval && (
                  <TableCell>
                    <Checkbox
                      checked={selectedForApproval?.has(payment.id) || false}
                      onCheckedChange={(checked) => onSelectForApproval(payment.id, !!checked)}
                    />
                  </TableCell>
                )}
                {showBankAdviceCheckbox && onSelectPayment && (
                  <TableCell>
                    <Checkbox
                      checked={selectedPayments?.has(payment.id)}
                      onCheckedChange={(checked) => onSelectPayment(payment.id, checked as boolean)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {payment.doctors?.profiles?.full_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {payment.doctors?.doctor_code}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {payment.discharge_date ? (
                    <div className="text-sm font-medium">
                      {formatDateIST(payment.discharge_date)}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">-</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1 max-w-[200px]">
                    {payment.patient_names && payment.patient_names.length > 0 ? (
                      <>
                        {((expandPatientsByDefault || expandedPatients.has(payment.id))
                          ? payment.patient_names 
                          : payment.patient_names.slice(0, 2)
                        ).map((name, idx) => (
                          <div key={idx} className="text-sm truncate" title={name}>
                            {name}
                          </div>
                        ))}
                        {!expandPatientsByDefault && payment.patient_names.length > 2 && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-secondary/80"
                            onClick={() => {
                              const newExpanded = new Set(expandedPatients);
                              if (expandedPatients.has(payment.id)) {
                                newExpanded.delete(payment.id);
                              } else {
                                newExpanded.add(payment.id);
                              }
                              setExpandedPatients(newExpanded);
                            }}
                          >
                            {expandedPatients.has(payment.id) 
                              ? 'Show less' 
                              : `+${payment.patient_names.length - 2} more`
                            }
                          </Badge>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">No patients</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {(payment.cash_total ?? 0) > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          Cash
                        </Badge>
                        <span className="font-medium">{formatCurrency(payment.cash_total || 0)}</span>
                        <span className="text-muted-foreground">({payment.cash_visits})</span>
                      </div>
                    )}
                    {(payment.insurance_total ?? 0) > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          Insurance
                        </Badge>
                        <span className="font-medium">{formatCurrency(payment.insurance_total || 0)}</span>
                        <span className="text-muted-foreground">({payment.insurance_visits})</span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatCurrency(payment.total_amount)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm">
                    <div className="font-semibold">{formatCurrency(payment.gross_amount || payment.total_amount)}</div>
                    <div className="text-xs text-muted-foreground">Gross</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm">
                    <div className="font-medium text-destructive">
                      -{formatCurrency(payment.tds_amount || (payment.gross_amount || payment.total_amount) * 0.10)}
                    </div>
                    <div className="text-xs text-muted-foreground">TDS 10%</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm">
                    <div className="font-semibold text-success">
                      {formatCurrency(payment.net_amount || (payment.gross_amount || payment.total_amount) * 0.90)}
                    </div>
                    <div className="text-xs text-muted-foreground">Net</div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-success">
                  <div className="text-sm">
                    <div className="font-medium">{formatCurrency(payment.total_released_net || payment.paid_amount || 0)}</div>
                    <div className="text-xs text-muted-foreground">Net Paid</div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-warning">
                  <div className="text-sm">
                    <div className="font-medium">
                      {formatCurrency(
                        payment.total_released_gross 
                          ? (payment.gross_amount || payment.total_amount) - payment.total_released_gross
                          : payment.paid_amount && payment.paid_amount > 0
                            ? (payment.gross_amount || payment.total_amount) - (payment.paid_amount / 0.9)
                            : (payment.gross_amount || payment.total_amount)
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">Gross Remaining</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-center gap-1">
                    {payment.is_suspect && (
                      <Badge variant="destructive" className="text-xs mb-1">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        SUSPECT
                      </Badge>
                    )}
                    {getStatusBadge(payment.status)}
                    {payment.release_status && payment.release_status !== 'not_started' && (
                      <Badge 
                        variant={payment.release_status === 'fully_released' ? 'default' : 'secondary'}
                        className="text-xs mt-1"
                      >
                        {payment.release_status === 'fully_released' ? 'Fully Released' : 
                         `Released ${payment.release_count || 0}x`}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    {userRole !== 'doctor' && payment.status !== 'rejected' && (
                      <>
                        {(userRole === 'manager' && payment.status === 'pending') || 
                         (userRole === 'admin' && (payment.status === 'pending' || payment.status === 'manager_approved')) ? (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onApprove(payment.id)}
                                  className="h-8 px-2"
                                >
                                  <CheckCircle className="h-4 w-4 text-success" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Approve payment for {payment.doctors?.profiles?.full_name}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onReject(payment.id)}
                                  className="h-8 px-2"
                                >
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reject payment request</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        ) : null}
                        {userRole === 'admin' && payment.status === 'pending' && (
                          <>
                            {onEdit && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onEdit(payment)}
                                    className="h-8 px-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Edit payment details</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {onDelete && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onDelete(payment.id)}
                                    className="h-8 px-2"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete payment record</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        )}
                        {onMarkSuspect && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onMarkSuspect(payment)}
                                className="h-8 px-2"
                              >
                                <AlertTriangle className={`h-4 w-4 ${payment.is_suspect ? 'text-warning' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{payment.is_suspect ? 'Remove suspect flag' : 'Mark as suspect payment'}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </>
                    )}
                    {payment.status === 'admin_approved' && onRecordPayment && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRecordPayment(payment)}
                            className="h-8 px-2"
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Record payment transaction - {formatCurrency(payment.remaining_amount)} remaining</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {(payment.status === 'admin_approved' || 
                      payment.cash_approval_status === 'approved' || 
                      payment.insurance_approval_status === 'approved') && 
                     onPartPayment && 
                     payment.release_status !== 'fully_released' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onPartPayment(payment)}
                            className="h-8 px-2"
                          >
                            <Split className="h-4 w-4 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Release part payment</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {(payment.release_count && payment.release_count > 0) && onViewReleaseHistory && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewReleaseHistory(payment)}
                            className="h-8 px-2"
                          >
                            <History className="h-4 w-4 text-blue-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View release history ({payment.release_count} releases)</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {onViewTransactions && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onViewTransactions(payment)}
                            className="h-8 px-2"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View payment history and transactions</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  </TableCell>
                </TableRow>
                {(payment.insurance_total ?? 0) > 0 && (
                  <TableRow className="bg-blue-50/50 dark:bg-blue-950/20 border-t-0">
                    <TableCell colSpan={showBankAdviceCheckbox ? 10 : 9} className="py-2">
                      <div className="text-xs space-y-1 pl-4">
                        <div className="font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          Insurance Payment Details:
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                          <span><strong>Doctor:</strong> {payment.doctors?.profiles?.full_name} ({payment.doctors?.doctor_code})</span>
                          <span><strong>Discharge Date:</strong> {payment.discharge_date ? formatDateIST(payment.discharge_date) : 'N/A'}</span>
                          <span><strong>Patients:</strong> {payment.patient_names?.join(', ') || 'N/A'}</span>
                          <span><strong>Payment Type:</strong> Insurance</span>
                          {payment.insurance_company_names && payment.insurance_company_names.length > 0 && (
                            <span><strong>Insurance Companies:</strong> {payment.insurance_company_names.join(', ')}</span>
                          )}
                          <span><strong>Total Amount:</strong> {formatCurrency(payment.insurance_total || 0)}</span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))
          )}
        </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};

export default PaymentManagementTable;
