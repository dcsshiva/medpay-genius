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
            <TableHead className="text-center">Patient Count</TableHead>
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
              <TableRow key={payment.id} className={payment.is_suspect ? 'bg-destructive/5' : ''}>
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
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-medium">
                    {payment.total_visits}
                  </Badge>
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onApprove(payment.id)}
                              className="h-8 px-2"
                            >
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onReject(payment.id)}
                              className="h-8 px-2"
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : null}
                        {userRole === 'admin' && payment.status === 'pending' && (
                          <>
                            {onEdit && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onEdit(payment)}
                                className="h-8 px-2"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDelete(payment.id)}
                                className="h-8 px-2"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </>
                        )}
                        {onMarkSuspect && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onMarkSuspect(payment)}
                            className="h-8 px-2"
                          >
                            <AlertTriangle className={`h-4 w-4 ${payment.is_suspect ? 'text-warning' : ''}`} />
                          </Button>
                        )}
                      </>
                    )}
                    {payment.status === 'admin_approved' && onRecordPayment && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRecordPayment(payment)}
                        className="h-8 px-2"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}
                    {onViewTransactions && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewTransactions(payment)}
                        className="h-8 px-2"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PaymentManagementTable;
