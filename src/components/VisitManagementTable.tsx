import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { formatDateIST } from '@/lib/dateUtils';
import { MobileListCard } from '@/components/mobile/MobileListCard';


interface Visit {
  id: string;
  visit_code?: string;
  visit_date: string;
  patient_count: number;
  patient_id?: string;
  patient_name: string;
  visit_payment?: number;
  payment_type: string;
  visit_reason: string;
  notes?: string;
  doctor_id: string;
  is_processed: boolean;
  processed_in_payment_id?: string;
  processed_at?: string;
  insurance_company_id?: string;
  insurance_company_name?: string;
  insurance_company_code?: string;
  doctors: {
    doctor_code: string;
    profiles: {
      full_name: string;
    };
  };
}

interface VisitManagementTableProps {
  visits: Visit[];
  onEdit?: (visit: Visit) => void;
  onDelete?: (visitId: string) => void;
  onPaymentTypeClick?: (paymentType: 'cash' | 'insurance') => void;
  onDoctorClick?: (doctorName: string) => void;
  onPaymentTypeFilter?: (paymentType: 'cash' | 'insurance') => void;
  showActions?: boolean;
  sortField: 'visit_date' | 'patient_name' | 'doctor_name';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'visit_date' | 'patient_name' | 'doctor_name') => void;
}

export const VisitManagementTable: React.FC<VisitManagementTableProps> = ({
  visits,
  onEdit,
  onDelete,
  onPaymentTypeClick,
  onDoctorClick,
  onPaymentTypeFilter,
  showActions = true,
  sortField,
  sortDirection,
  onSort
}) => {
  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 inline" /> : <ChevronDown className="h-4 w-4 inline" />;
  };

  return (
    <>
      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {visits.map((visit) => (
          <MobileListCard
            key={visit.id}
            title={
              <span className="flex items-center gap-2">
                <span className="truncate">{visit.patient_name}</span>
                {visit.visit_code && (
                  <span className="font-mono text-[10px] text-muted-foreground">{visit.visit_code}</span>
                )}
              </span>
            }
            subtitle={
              <span>
                {formatDateIST(visit.visit_date)} · {visit.doctors.profiles.full_name}
              </span>
            }
            amount={visit.visit_payment ? `₹${visit.visit_payment.toFixed(2)}` : '-'}
            status={
              <div className="flex flex-col items-end gap-1">
                <Badge variant={visit.payment_type === 'cash' ? 'default' : 'secondary'} className="text-[10px]">
                  {visit.payment_type === 'cash' ? 'Cash' : 'Insurance'}
                </Badge>
                <Badge variant={visit.is_processed ? 'default' : 'outline'} className="text-[10px]">
                  {visit.is_processed ? 'Processed' : 'Pending'}
                </Badge>
              </div>
            }
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="text-muted-foreground capitalize">
                {visit.visit_reason.replace('_', ' ')} · {visit.patient_count} pt
                {visit.insurance_company_name ? ` · ${visit.insurance_company_name}` : ''}
              </div>
              {showActions && (
                <div className="flex gap-1">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => { e.stopPropagation(); onEdit(visit); }}
                      disabled={visit.is_processed}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => { e.stopPropagation(); onDelete(visit.id); }}
                      disabled={visit.is_processed}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </MobileListCard>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>

      <TableHeader>
        <TableRow>
          <TableHead>Visit Code</TableHead>
          <TableHead className="cursor-pointer" onClick={() => onSort('visit_date')}>
            Visit Date <SortIcon field="visit_date" />
          </TableHead>
          <TableHead className="cursor-pointer" onClick={() => onSort('doctor_name')}>
            Doctor <SortIcon field="doctor_name" />
          </TableHead>
          <TableHead className="cursor-pointer" onClick={() => onSort('patient_name')}>
            Patient <SortIcon field="patient_name" />
          </TableHead>
          <TableHead className="text-center">Patient Count</TableHead>
          <TableHead>Payment Type</TableHead>
          <TableHead>Insurance Company</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Visit Reason</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {visits.map((visit) => (
          <TableRow key={visit.id}>
            <TableCell className="font-mono text-sm font-semibold">{visit.visit_code || '-'}</TableCell>
            <TableCell className="font-medium">{formatDateIST(visit.visit_date)}</TableCell>
            <TableCell>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="cursor-pointer hover:bg-accent/50 rounded-md p-1 -m-1 transition-colors"
                    onClick={() => onDoctorClick?.(visit.doctors.profiles.full_name)}
                  >
                    <div className="font-medium text-primary hover:underline">{visit.doctors.profiles.full_name}</div>
                    <div className="text-xs text-muted-foreground">{visit.doctors.doctor_code}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to filter by this doctor</p>
                </TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{visit.patient_name}</div>
                {visit.patient_id && <div className="text-xs text-muted-foreground">ID: {visit.patient_id}</div>}
              </div>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="outline">{visit.patient_count}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                {/* Navigate to payment management */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant={visit.payment_type === 'cash' ? 'default' : 'secondary'}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onPaymentTypeClick?.(visit.payment_type as 'cash' | 'insurance')}
                    >
                      {visit.payment_type === 'cash' ? 'Cash' : 'Insurance'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to go to {visit.payment_type === 'cash' ? 'Cash' : 'Insurance'} Payment Management</p>
                  </TooltipContent>
                </Tooltip>
                {/* Filter by payment type */}
                {onPaymentTypeFilter && (
                  <button
                    onClick={() => onPaymentTypeFilter(visit.payment_type as 'cash' | 'insurance')}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors underline"
                  >
                    Filter {visit.payment_type}
                  </button>
                )}
              </div>
            </TableCell>
            <TableCell>
              {visit.payment_type === 'insurance' && visit.insurance_company_name ? (
                <div>
                  <div className="font-medium">{visit.insurance_company_name}</div>
                  {visit.insurance_company_code && (
                    <div className="text-xs text-muted-foreground">{visit.insurance_company_code}</div>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
            <TableCell className="text-right font-medium">
              {visit.visit_payment ? `₹${visit.visit_payment.toFixed(2)}` : '-'}
            </TableCell>
            <TableCell className="capitalize text-sm">{visit.visit_reason.replace('_', ' ')}</TableCell>
            <TableCell>
              <Badge variant={visit.is_processed ? 'default' : 'secondary'}>
                {visit.is_processed ? 'Processed' : 'Pending'}
              </Badge>
            </TableCell>
            {showActions && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {onEdit && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEdit(visit)}
                      disabled={visit.is_processed}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => onDelete(visit.id)}
                      disabled={visit.is_processed}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
