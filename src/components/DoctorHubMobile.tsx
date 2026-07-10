import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MobileSegmentedTabs from '@/components/mobile/MobileSegmentedTabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Clock, Receipt, Calendar, FileText, CheckCircle2, AlertCircle, IndianRupee } from 'lucide-react';
import { formatCurrency } from '@/lib/currency';
import { formatDateIST } from '@/lib/dateUtils';
import DoctorHistoryExport from './DoctorHistoryExport';
import CheckUpdateButton from './CheckUpdateButton';

interface DoctorSummary {
  id: string;
  doctor_code: string;
  full_name: string;
  paid_amount: number;
  unpaid_amount: number;
  total_amount: number;
  paid_count: number;
  unpaid_visits_count: number;
}

interface PaymentHistory {
  id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  tds_amount: number;
  net_amount: number;
  bank_advice_generated_at: string;
}

interface UnpaidVisit {
  id: string;
  visit_code: string;
  visit_date: string;
  patient_name: string;
  visit_payment: number;
  payment_type: string;
  is_processed: boolean;
  payment_status?: string;
}

interface PaymentVisitDetail {
  id: string;
  visit_code: string;
  visit_date: string;
  patient_name: string;
  payment_type: string;
  visit_payment: number;
  status: string;
}

interface DoctorHubMobileProps {
  doctor: DoctorSummary;
  paymentHistory: PaymentHistory[];
  unpaidVisits: UnpaidVisit[];
  detailsLoading: boolean;
  expandedPaymentIds: Set<string>;
  paymentVisitsData: Map<string, PaymentVisitDetail[]>;
  paymentVisitsLoading: Set<string>;
  onTabChange: (tab: 'paid' | 'unpaid' | 'all') => void;
  onPaymentRowExpand: (paymentId: string) => void;
  onPeriodChange: (period: 'all' | 'custom') => void;
  onCustomDateChange: (start: string, end: string) => void;
  selectedPeriod: 'all' | 'custom';
  customDateRange: { start: string; end: string };
  fetchVisitDetails: (paymentId: string) => Promise<any[]>;
}

const DoctorHubMobile: React.FC<DoctorHubMobileProps> = ({
  doctor,
  paymentHistory,
  unpaidVisits,
  detailsLoading,
  expandedPaymentIds,
  paymentVisitsData,
  paymentVisitsLoading,
  onTabChange,
  onPaymentRowExpand,
  onPeriodChange,
  onCustomDateChange,
  selectedPeriod,
  customDateRange,
  fetchVisitDetails,
}) => {
  const [activeTab, setActiveTab] = useState<'paid' | 'unpaid' | 'all'>('all');

  const handleTabChange = (value: string) => {
    const tab = value as 'paid' | 'unpaid' | 'all';
    setActiveTab(tab);
    onTabChange(tab);
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">{doctor.doctor_code}</span>
              <span>•</span>
              <span>{doctor.full_name}</span>
            </div>
          </div>
          <CheckUpdateButton />
        </div>
      </div>

      {/* Clickable Summary Cards */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-3">
        <Card 
          className={`cursor-pointer active:scale-95 transition-transform ${activeTab === 'paid' ? 'ring-2 ring-success' : ''}`}
          onClick={() => handleTabChange('paid')}
        >
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="text-lg font-bold text-success">{formatCurrency(doctor.paid_amount)}</p>
            <p className="text-xs text-muted-foreground">Paid ({doctor.paid_count})</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer active:scale-95 transition-transform ${activeTab === 'unpaid' ? 'ring-2 ring-warning' : ''}`}
          onClick={() => handleTabChange('unpaid')}
        >
          <CardContent className="p-3 text-center">
            <AlertCircle className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-lg font-bold text-warning">{formatCurrency(doctor.unpaid_amount)}</p>
            <p className="text-xs text-muted-foreground">Unpaid ({doctor.unpaid_visits_count})</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer active:scale-95 transition-transform ${activeTab === 'all' ? 'ring-2 ring-primary' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          <CardContent className="p-3 text-center">
            <IndianRupee className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-primary">{formatCurrency(doctor.total_amount)}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Filters */}
      <div className="px-4 space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[400px]">
              <SheetHeader>
                <SheetTitle>Filter by Period</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-6">
                <Button
                  variant={selectedPeriod === 'all' ? 'default' : 'outline'}
                  className="w-full justify-start h-14"
                  onClick={() => onPeriodChange('all')}
                >
                  All Time
                </Button>
                <Button
                  variant={selectedPeriod === 'custom' ? 'default' : 'outline'}
                  className="w-full justify-start h-14"
                  onClick={() => onPeriodChange('custom')}
                >
                  Custom Date Range
                </Button>
                {selectedPeriod === 'custom' && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => onCustomDateChange(e.target.value, customDateRange.end)}
                        className="w-full h-12 px-3 rounded-md border border-input bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-2">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => onCustomDateChange(customDateRange.start, e.target.value)}
                        className="w-full h-12 px-3 rounded-md border border-input bg-background text-foreground"
                      />
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Export Button */}
        <DoctorHistoryExport
          doctorName={doctor.full_name}
          doctorCode={doctor.doctor_code}
          paymentHistory={paymentHistory}
          unpaidVisits={unpaidVisits}
          paymentVisitsData={paymentVisitsData}
          periodFilter={selectedPeriod}
          customDateRange={customDateRange}
          fetchVisitDetails={fetchVisitDetails}
        />

        {/* Tabs — mobile segmented control */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <MobileSegmentedTabs
            value={activeTab}
            onValueChange={(v) => handleTabChange(v as 'all' | 'paid' | 'unpaid')}
            sticky={false}
            className="!mx-0 !px-0"
            segments={[
              { value: 'all', label: 'All' },
              { value: 'paid', label: `Paid (${doctor.paid_count})` },
              { value: 'unpaid', label: `Unpaid (${doctor.unpaid_visits_count})` },
            ]}
          />

          {/* All Tab */}
          <TabsContent value="all" className="space-y-4 mt-4">
            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {paymentHistory.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Paid Payments ({paymentHistory.length})
                    </h3>
                    {paymentHistory.map((payment) => (
                      <PaymentCard
                        key={payment.id}
                        payment={payment}
                        isExpanded={expandedPaymentIds.has(payment.id)}
                        isLoading={paymentVisitsLoading.has(payment.id)}
                        visitDetails={paymentVisitsData.get(payment.id) || []}
                        onToggle={() => onPaymentRowExpand(payment.id)}
                      />
                    ))}
                  </div>
                )}
                {unpaidVisits.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Unpaid Visits ({unpaidVisits.length})
                    </h3>
                    {unpaidVisits.map((visit) => (
                      <UnpaidVisitCard key={visit.id} visit={visit} />
                    ))}
                  </div>
                )}
                {paymentHistory.length === 0 && unpaidVisits.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Paid Tab */}
          <TabsContent value="paid" className="space-y-3 mt-4">
            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : paymentHistory.length > 0 ? (
              paymentHistory.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  isExpanded={expandedPaymentIds.has(payment.id)}
                  isLoading={paymentVisitsLoading.has(payment.id)}
                  visitDetails={paymentVisitsData.get(payment.id) || []}
                  onToggle={() => onPaymentRowExpand(payment.id)}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No paid payments</p>
              </div>
            )}
          </TabsContent>

          {/* Unpaid Tab */}
          <TabsContent value="unpaid" className="space-y-3 mt-4">
            {detailsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : unpaidVisits.length > 0 ? (
              unpaidVisits.map((visit) => (
                <UnpaidVisitCard key={visit.id} visit={visit} />
              ))
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">No unpaid visits</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Payment Card Component
const PaymentCard: React.FC<{
  payment: PaymentHistory;
  isExpanded: boolean;
  isLoading: boolean;
  visitDetails: PaymentVisitDetail[];
  onToggle: () => void;
}> = ({ payment, isExpanded, isLoading, visitDetails, onToggle }) => {
  return (
    <Card className="hover-lift">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <CardTitle className="text-base font-semibold">
                  {formatDateIST(payment.period_start)} - {formatDateIST(payment.period_end)}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">Paid</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateIST(payment.bank_advice_generated_at)}
                  </span>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Gross</p>
              <p className="font-semibold">{formatCurrency(payment.gross_amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">TDS</p>
              <p className="font-semibold text-destructive">-{formatCurrency(payment.tds_amount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Net</p>
              <p className="font-semibold text-success">{formatCurrency(payment.net_amount)}</p>
            </div>
          </div>

          <CollapsibleContent>
            <div className="border-t pt-3 mt-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : visitDetails.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Visit Details ({visitDetails.length})
                  </p>
                  {visitDetails.map((visit) => (
                    <div key={visit.id} className="bg-muted/50 rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{visit.visit_code}</span>
                        <Badge variant="outline" className="text-xs">{visit.payment_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{visit.patient_name}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{formatDateIST(visit.visit_date)}</span>
                        <span className="font-semibold">{formatCurrency(visit.visit_payment)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No visit details</p>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
};

// Unpaid Visit Card Component
const UnpaidVisitCard: React.FC<{ visit: UnpaidVisit }> = ({ visit }) => {
  return (
    <Card className="hover-lift">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">{visit.visit_code}</span>
          <Badge variant={visit.payment_status === 'unprocessed' ? 'secondary' : 'outline'} className="text-xs">
            {visit.payment_status === 'unprocessed' ? 'Unprocessed' : visit.payment_status || 'In Payment'}
          </Badge>
        </div>
        <p className="text-sm text-foreground">{visit.patient_name}</p>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">{visit.payment_type}</Badge>
          <span className="text-xs text-muted-foreground">{formatDateIST(visit.visit_date)}</span>
        </div>
        <div className="pt-2 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Amount</span>
          <span className="text-base font-bold text-warning">{formatCurrency(visit.visit_payment)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default DoctorHubMobile;
