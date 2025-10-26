import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { 
  Wallet, 
  Building2, 
  Zap, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  cashVisits: { count: number; amount: number };
  insuranceVisits: { count: number; amount: number };
  quickPayments: { count: number; amount: number };
  pendingApprovals: { count: number; amount: number };
  totalUnprocessed: { count: number; amount: number };
}

interface PaymentHubDashboardProps {
  onNavigateToCreate: () => void;
  onNavigateToApproval: () => void;
}

const PaymentHubDashboard = ({ onNavigateToCreate, onNavigateToApproval }: PaymentHubDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    cashVisits: { count: 0, amount: 0 },
    insuranceVisits: { count: 0, amount: 0 },
    quickPayments: { count: 0, amount: 0 },
    pendingApprovals: { count: 0, amount: 0 },
    totalUnprocessed: { count: 0, amount: 0 }
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch unprocessed cash visits
      const { data: cashVisits, error: cashError } = await supabase
        .from('visits')
        .select('visit_payment')
        .eq('is_processed', false)
        .eq('payment_type', 'cash');

      if (cashError) throw cashError;

      // Fetch unprocessed insurance visits
      const { data: insuranceVisits, error: insuranceError } = await supabase
        .from('visits')
        .select('visit_payment')
        .eq('is_processed', false)
        .eq('payment_type', 'insurance');

      if (insuranceError) throw insuranceError;

      // Fetch quick payments without bank advice
      const { data: quickPayments, error: quickError } = await supabase
        .from('quick_payments')
        .select('net_amount')
        .eq('bank_advice_generated', false);

      if (quickError) throw quickError;

      // Fetch pending payment approvals
      const { data: pendingPayments, error: pendingError } = await supabase
        .from('payments')
        .select('net_amount')
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      const cashStats = {
        count: cashVisits?.length || 0,
        amount: cashVisits?.reduce((sum, v) => sum + (Number(v.visit_payment) || 0), 0) || 0
      };

      const insuranceStats = {
        count: insuranceVisits?.length || 0,
        amount: insuranceVisits?.reduce((sum, v) => sum + (Number(v.visit_payment) || 0), 0) || 0
      };

      const quickStats = {
        count: quickPayments?.length || 0,
        amount: quickPayments?.reduce((sum, q) => sum + (Number(q.net_amount) || 0), 0) || 0
      };

      const pendingStats = {
        count: pendingPayments?.length || 0,
        amount: pendingPayments?.reduce((sum, p) => sum + (Number(p.net_amount) || 0), 0) || 0
      };

      const totalStats = {
        count: cashStats.count + insuranceStats.count + quickStats.count,
        amount: cashStats.amount + insuranceStats.amount + quickStats.amount
      };

      setStats({
        cashVisits: cashStats,
        insuranceVisits: insuranceStats,
        quickPayments: quickStats,
        pendingApprovals: pendingStats,
        totalUnprocessed: totalStats
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-8 bg-muted rounded w-3/4 mt-2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Payment Overview
          </CardTitle>
          <CardDescription>All unprocessed payments across types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{stats.totalUnprocessed.count}</span>
              <span className="text-muted-foreground">items pending</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(stats.totalUnprocessed.amount)}
              </span>
              <span className="text-muted-foreground">total amount</span>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={onNavigateToCreate} className="flex-1">
                <ArrowRight className="h-4 w-4 mr-2" />
                Create Payment Advice
              </Button>
              {stats.pendingApprovals.count > 0 && (
                <Button onClick={onNavigateToApproval} variant="outline" className="flex-1">
                  <Clock className="h-4 w-4 mr-2" />
                  Review Approvals ({stats.pendingApprovals.count})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Type Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Cash Visits */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Cash Visits
              </CardTitle>
              <Badge variant="secondary">{stats.cashVisits.count}</Badge>
            </div>
            <CardDescription>Unprocessed cash payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.cashVisits.amount)}
              </div>
              <p className="text-sm text-muted-foreground">
                Ready for payment advice creation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Visits */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Insurance Visits
              </CardTitle>
              <Badge variant="secondary">{stats.insuranceVisits.count}</Badge>
            </div>
            <CardDescription>Unprocessed insurance payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.insuranceVisits.amount)}
              </div>
              <p className="text-sm text-muted-foreground">
                Ready for payment advice creation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Payments */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                Quick Payments
              </CardTitle>
              <Badge variant="secondary">{stats.quickPayments.count}</Badge>
            </div>
            <CardDescription>Without bank advice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.quickPayments.amount)}
              </div>
              <p className="text-sm text-muted-foreground">
                Ready for bank advice generation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Alert */}
      {stats.pendingApprovals.count > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  {stats.pendingApprovals.count} payment advices awaiting approval
                </p>
                <p className="text-sm text-muted-foreground">
                  Total amount: {formatCurrency(stats.pendingApprovals.amount)}
                </p>
              </div>
              <Button onClick={onNavigateToApproval} variant="outline">
                Review Now
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {stats.totalUnprocessed.count === 0 && stats.pendingApprovals.count === 0 && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              All Caught Up!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No pending payments or approvals. Great work!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentHubDashboard;
