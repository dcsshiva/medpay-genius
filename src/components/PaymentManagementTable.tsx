import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Edit,
  Trash2,
  AlertTriangle,
  History,
  CreditCard,
  Building2
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST } from '@/lib/dateUtils';

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
  showBankAdviceCheckbox?: boolean;
  selectedPayments?: Set<string>;
  onSelectPayment?: (paymentId: string, checked: boolean) => void;
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
  showBankAdviceCheckbox,
  selectedPayments,
  onSelectPayment,
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

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

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
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
                colSpan={showBankAdviceCheckbox ? 10 : 9} 
                className="text-center text-muted-foreground py-8"
              >
                No payments found
              </TableCell>
            </TableRow>
          ) : (
            sortedPayments.map((payment) => (
              <React.Fragment key={payment.id}>
                <TableRow className={payment.is_suspect ? 'bg-destructive/5' : ''}>
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
                        {payment.patient_names.slice(0, 2).map((name, idx) => (
                          <div key={idx} className="text-sm truncate" title={name}>
                            {name}
                          </div>
                        ))}
                        {payment.patient_names.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{payment.patient_names.length - 2} more
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
                <TableCell className="text-right text-success">
                  {formatCurrency(payment.paid_amount)}
                </TableCell>
                <TableCell className="text-right text-warning">
                  {formatCurrency(payment.remaining_amount)}
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
                {/* Show detailed breakdown for insurance payments */}
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
