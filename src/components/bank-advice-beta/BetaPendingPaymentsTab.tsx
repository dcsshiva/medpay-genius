import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ChevronDown, 
  ChevronRight, 
  Users, 
  DollarSign, 
  FileText,
  TrendingUp,
  ArrowUpDown
} from 'lucide-react';
import { GroupedPendingPayment } from './types';
import { PaymentDetailsExpansion } from './PaymentDetailsExpansion';
import { formatCurrency } from '@/lib/currency';
import { formatDateTimeIST, formatInputDateIST, getCurrentISTDate } from '@/lib/dateUtils';

interface Props {
  groupedPayments: GroupedPendingPayment[];
  onGenerateAdvice: (paymentIds: string[]) => void;
  onSendToManager: (paymentIds: string[]) => void;
}

export const BetaPendingPaymentsTab: React.FC<Props> = ({
  groupedPayments,
  onGenerateAdvice,
  onSendToManager,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'amount'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredAndSorted = useMemo(() => {
    let filtered = groupedPayments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.beneficiary_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.beneficiary_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        const comparison = a.beneficiary_name.localeCompare(b.beneficiary_name);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = a.total_cumulative_amount - b.total_cumulative_amount;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    return filtered;
  }, [groupedPayments, searchTerm, sortBy, sortOrder]);

  const stats = useMemo(() => {
    return {
      totalBeneficiaries: groupedPayments.length,
      totalGross: groupedPayments.reduce((sum, p) => sum + p.total_cumulative_amount, 0),
      totalCash: groupedPayments.reduce((sum, p) => sum + p.total_cash_amount, 0),
      totalInsurance: groupedPayments.reduce((sum, p) => sum + p.total_insurance_amount, 0),
    };
  }, [groupedPayments]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAndSorted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSorted.map(p => p.beneficiary_id));
    }
  };

  const toggleSort = (field: 'name' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Beneficiaries</p>
                <p className="text-2xl font-bold">{stats.totalBeneficiaries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Gross Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalGross)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Cash Payments</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalCash)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Insurance Payments</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalInsurance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                const allPaymentIds = groupedPayments
                  .filter(p => selectedIds.includes(p.beneficiary_id))
                  .flatMap(p => p.payment_ids);
                onGenerateAdvice(allPaymentIds);
              }}
              disabled={selectedIds.length === 0}
            >
              Generate Bank Advice ({selectedIds.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Payments ({filteredAndSorted.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Table Header */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded font-medium text-sm">
              <div className="w-10">
                <Checkbox
                  checked={selectedIds.length === filteredAndSorted.length && filteredAndSorted.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </div>
              <div className="flex-1">Date Approved</div>
              <div 
                className="flex-1 flex items-center gap-2 cursor-pointer hover:text-primary"
                onClick={() => toggleSort('name')}
              >
                Beneficiary Name/Code
                <ArrowUpDown className="h-4 w-4" />
              </div>
              <div className="w-24">Type</div>
              <div className="w-32 text-right">Cash Amount</div>
              <div className="w-32 text-right">Insurance Amount</div>
              <div 
                className="w-32 text-right flex items-center justify-end gap-2 cursor-pointer hover:text-primary"
                onClick={() => toggleSort('amount')}
              >
                Total
                <ArrowUpDown className="h-4 w-4" />
              </div>
              <div className="w-10"></div>
            </div>

            {/* Table Rows */}
            {filteredAndSorted.map((payment) => (
              <div key={payment.beneficiary_id}>
                <div className="flex items-center gap-4 p-3 hover:bg-muted/30 rounded border">
                  <div className="w-10">
                    <Checkbox
                      checked={selectedIds.includes(payment.beneficiary_id)}
                      onCheckedChange={() => handleToggleSelect(payment.beneficiary_id)}
                    />
                  </div>
                  <div className="flex-1 text-sm">
                    {formatDateTimeIST(payment.latest_approved_at)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{payment.beneficiary_name}</p>
                    {payment.beneficiary_code && (
                      <p className="text-sm text-muted-foreground">({payment.beneficiary_code})</p>
                    )}
                  </div>
                  <div className="w-24">
                    <Badge variant={payment.beneficiary_type === 'doctor' ? 'default' : 'secondary'}>
                      {payment.beneficiary_type}
                    </Badge>
                  </div>
                  <div className="w-32 text-right">
                    {formatCurrency(payment.total_cash_amount)}
                  </div>
                  <div className="w-32 text-right">
                    {formatCurrency(payment.total_insurance_amount)}
                  </div>
                  <div className="w-32 text-right font-medium">
                    {formatCurrency(payment.total_cumulative_amount)}
                  </div>
                  <div className="w-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleExpand(payment.beneficiary_id)}
                    >
                      {expandedIds.includes(payment.beneficiary_id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedIds.includes(payment.beneficiary_id) && (
                  <PaymentDetailsExpansion
                    payment={payment}
                    onSendToManager={onSendToManager}
                    onGenerateAdvice={onGenerateAdvice}
                  />
                )}
              </div>
            ))}

            {filteredAndSorted.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No pending payments found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
