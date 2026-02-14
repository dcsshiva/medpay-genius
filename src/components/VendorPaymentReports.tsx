import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Download, Loader2, DollarSign, Users, FileText, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/lib/currency';

interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
}

interface QuickPayment {
  id: string;
  vendor_id: string | null;
  name: string;
  gross_amount: number;
  tds_amount: number | null;
  net_amount: number | null;
  payment_mode: string | null;
  created_at: string;
  payment_notes: string | null;
}

interface VendorSummary {
  vendor_id: string;
  vendor_name: string;
  vendor_code: string;
  totalGross: number;
  totalTds: number;
  totalNet: number;
  paymentCount: number;
  bankCount: number;
  cashCount: number;
  chequeCount: number;
}

const VendorPaymentReports: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<QuickPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [drillDownVendor, setDrillDownVendor] = useState<VendorSummary | null>(null);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let payQuery = supabase
        .from('quick_payments')
        .select('id, vendor_id, name, gross_amount, tds_amount, net_amount, payment_mode, created_at, payment_notes')
        .not('vendor_id', 'is', null);

      if (dateFrom) payQuery = payQuery.gte('created_at', dateFrom + 'T00:00:00');
      if (dateTo) payQuery = payQuery.lte('created_at', dateTo + 'T23:59:59');

      const [vendorRes, payRes] = await Promise.all([
        supabase.from('vendors').select('id, vendor_code, vendor_name').eq('is_active', true).order('vendor_name'),
        payQuery.order('created_at', { ascending: false }),
      ]);

      if (vendorRes.error) throw vendorRes.error;
      if (payRes.error) throw payRes.error;

      setVendors(vendorRes.data || []);
      setPayments(payRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const vendorMap = useMemo(() => {
    const m: Record<string, Vendor> = {};
    vendors.forEach(v => { m[v.id] = v; });
    return m;
  }, [vendors]);

  const summaries: VendorSummary[] = useMemo(() => {
    const map: Record<string, VendorSummary> = {};
    payments.forEach(p => {
      if (!p.vendor_id) return;
      if (!map[p.vendor_id]) {
        const v = vendorMap[p.vendor_id];
        map[p.vendor_id] = {
          vendor_id: p.vendor_id,
          vendor_name: v?.vendor_name || p.name,
          vendor_code: v?.vendor_code || '-',
          totalGross: 0, totalTds: 0, totalNet: 0,
          paymentCount: 0, bankCount: 0, cashCount: 0, chequeCount: 0,
        };
      }
      const s = map[p.vendor_id];
      s.totalGross += p.gross_amount || 0;
      s.totalTds += p.tds_amount || 0;
      s.totalNet += p.net_amount || 0;
      s.paymentCount++;
      if (p.payment_mode === 'bank') s.bankCount++;
      else if (p.payment_mode === 'cash') s.cashCount++;
      else if (p.payment_mode === 'cheque') s.chequeCount++;
    });

    let result = Object.values(map);
    if (vendorFilter !== 'all') result = result.filter(s => s.vendor_id === vendorFilter);
    return result.sort((a, b) => b.totalGross - a.totalGross);
  }, [payments, vendorMap, vendorFilter]);

  const totals = useMemo(() => {
    return summaries.reduce((acc, s) => ({
      gross: acc.gross + s.totalGross,
      tds: acc.tds + s.totalTds,
      net: acc.net + s.totalNet,
      count: acc.count + s.paymentCount,
    }), { gross: 0, tds: 0, net: 0, count: 0 });
  }, [summaries]);

  const drillDownPayments = useMemo(() => {
    if (!drillDownVendor) return [];
    return payments.filter(p => p.vendor_id === drillDownVendor.vendor_id);
  }, [drillDownVendor, payments]);

  const exportToExcel = () => {
    const rows = summaries.map(s => ({
      'Vendor Code': s.vendor_code,
      'Vendor Name': s.vendor_name,
      'Total Gross': s.totalGross,
      'Total TDS': s.totalTds,
      'Total Net': s.totalNet,
      'Payments': s.paymentCount,
      'Bank': s.bankCount,
      'Cash': s.cashCount,
      'Cheque': s.chequeCount,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendor Payments');
    XLSX.writeFile(wb, `vendor_payment_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Report exported');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Vendor Payment Reports
            </CardTitle>
            <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Vendors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-auto" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-auto" />
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Card><CardContent className="pt-4 text-center">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold">{formatCurrency(totals.gross)}</div>
                  <p className="text-xs text-muted-foreground">Total Gross</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 text-center">
                  <div className="text-lg font-bold text-destructive">{formatCurrency(totals.tds)}</div>
                  <p className="text-xs text-muted-foreground">Total TDS</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 text-center">
                  <div className="text-lg font-bold text-primary">{formatCurrency(totals.net)}</div>
                  <p className="text-xs text-muted-foreground">Total Net</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-bold">{totals.count}</div>
                  <p className="text-xs text-muted-foreground">Total Payments</p>
                </CardContent></Card>
              </div>

              {/* Vendor Summary Table */}
              <div className="border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">TDS</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-center">#</TableHead>
                      <TableHead className="hidden md:table-cell text-center">Mode Split</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaries.map(s => (
                      <TableRow key={s.vendor_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDrillDownVendor(s)}>
                        <TableCell>
                          <div className="font-medium text-sm">{s.vendor_name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{s.vendor_code}</div>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(s.totalGross)}</TableCell>
                        <TableCell className="text-right text-sm hidden sm:table-cell text-destructive">{formatCurrency(s.totalTds)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(s.totalNet)}</TableCell>
                        <TableCell className="text-center">{s.paymentCount}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex justify-center gap-1">
                            {s.bankCount > 0 && <Badge variant="outline" className="text-xs">Bank: {s.bankCount}</Badge>}
                            {s.cashCount > 0 && <Badge variant="secondary" className="text-xs">Cash: {s.cashCount}</Badge>}
                            {s.chequeCount > 0 && <Badge variant="outline" className="text-xs">Cheque: {s.chequeCount}</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {summaries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No vendor payments found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Drill-down Dialog */}
      <Dialog open={!!drillDownVendor} onOpenChange={() => setDrillDownVendor(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setDrillDownVendor(null)}><ArrowLeft className="h-4 w-4" /></Button>
              {drillDownVendor?.vendor_name} — Payments
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">TDS</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillDownPayments.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">{format(new Date(p.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(p.gross_amount)}</TableCell>
                    <TableCell className="text-right text-sm text-destructive">{formatCurrency(p.tds_amount || 0)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(p.net_amount || 0)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{p.payment_mode || '-'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorPaymentReports;
