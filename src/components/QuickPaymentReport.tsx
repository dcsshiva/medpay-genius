import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VendorSearchCombobox } from '@/components/ui/vendor-search-combobox';
import { toast } from 'sonner';
import { Download, Loader2, FileText, Printer, ArrowLeft, Search } from 'lucide-react';
import { printReport, autoFitColumns } from '@/lib/printUtils';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/lib/currency';

interface PaymentType { id: string; type_name: string; }
interface Vendor { id: string; vendor_code: string; vendor_name: string; }
interface QuickPayment {
  id: string;
  vendor_id: string | null;
  payment_type_id: string | null;
  name: string;
  mobile_number: string | null;
  gross_amount: number;
  tds_amount: number | null;
  tds_percentage: number | null;
  net_amount: number | null;
  payment_mode: string | null;
  bank_name: string | null;
  account_number: string | null;
  cheque_number: string | null;
  payment_notes: string | null;
  bank_advice_generated: boolean | null;
  bank_advice_reference: string | null;
  created_at: string;
}

const QuickPaymentReport: React.FC = () => {
  const [types, setTypes] = useState<PaymentType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<QuickPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [drillDown, setDrillDown] = useState<QuickPayment | null>(null);

  useEffect(() => {
    (async () => {
      const [typesRes, vendorsRes] = await Promise.all([
        supabase.from('quick_payment_types').select('id, type_name').eq('is_active', true).order('type_name'),
        supabase.from('vendors').select('id, vendor_code, vendor_name').eq('is_active', true).order('vendor_name'),
      ]);
      setTypes(typesRes.data || []);
      setVendors(vendorsRes.data || []);
    })();
  }, []);

  useEffect(() => { fetchPayments(); }, [typeFilter, vendorFilter, dateFrom, dateTo]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { fetchAllPaginated } = await import('@/lib/fetchAllPaginated');
      const data = await fetchAllPaginated<any>(() => {
        let q = supabase
          .from('quick_payments')
          .select('id, vendor_id, payment_type_id, name, mobile_number, gross_amount, tds_amount, tds_percentage, net_amount, payment_mode, bank_name, account_number, cheque_number, payment_notes, bank_advice_generated, bank_advice_reference, created_at')
          .order('created_at', { ascending: false });
        if (typeFilter !== 'all') q = q.eq('payment_type_id', typeFilter);
        if (vendorFilter) q = q.eq('vendor_id', vendorFilter);
        if (dateFrom) q = q.gte('created_at', dateFrom + 'T00:00:00');
        if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
        return q as any;
      });
      setPayments(data);
    } catch (e: any) {
      toast.error('Failed to load: ' + e.message);
    } finally { setLoading(false); }
  };

  const typeMap = useMemo(() => Object.fromEntries(types.map(t => [t.id, t.type_name])), [types]);
  const vendorMap = useMemo(() => Object.fromEntries(vendors.map(v => [v.id, v])), [vendors]);

  const filtered = useMemo(() => {
    if (!nameSearch.trim()) return payments;
    const q = nameSearch.toLowerCase();
    return payments.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.mobile_number?.toLowerCase().includes(q) ||
      p.bank_advice_reference?.toLowerCase().includes(q)
    );
  }, [payments, nameSearch]);

  const totals = useMemo(() => filtered.reduce((a, p) => ({
    gross: a.gross + (p.gross_amount || 0),
    tds: a.tds + (p.tds_amount || 0),
    net: a.net + (p.net_amount || 0),
    count: a.count + 1,
  }), { gross: 0, tds: 0, net: 0, count: 0 }), [filtered]);

  const buildRows = () => filtered.map(p => ({
    'Date': format(new Date(p.created_at), 'dd/MM/yyyy HH:mm'),
    'Payment Type': p.payment_type_id ? (typeMap[p.payment_type_id] || '-') : '-',
    'Vendor': p.vendor_id ? (vendorMap[p.vendor_id]?.vendor_name || '-') : '-',
    'Name': p.name || '-',
    'Mobile': p.mobile_number || '-',
    'Mode': p.payment_mode || '-',
    'Gross': p.gross_amount || 0,
    'TDS %': p.tds_percentage || 0,
    'TDS': p.tds_amount || 0,
    'Net': p.net_amount || 0,
    'Bank': p.bank_name || '-',
    'Reference': p.bank_advice_reference || '-',
    'Status': p.bank_advice_generated ? 'Generated' : 'Pending',
    'Notes': p.payment_notes || '-',
  }));

  const exportExcel = () => {
    const rows = buildRows();
    if (!rows.length) return toast.warning('No data to export');
    rows.push({
      'Date': 'TOTAL', 'Payment Type': '', 'Vendor': '', 'Name': '', 'Mobile': '', 'Mode': '',
      'Gross': totals.gross as any, 'TDS %': '' as any, 'TDS': totals.tds as any, 'Net': totals.net as any,
      'Bank': '', 'Reference': '', 'Status': '', 'Notes': `${totals.count} payments`,
    } as any);
    const ws = XLSX.utils.json_to_sheet(rows);
    autoFitColumns(ws, rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quick Payments');
    XLSX.writeFile(wb, `quick_payment_report_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
    toast.success('Exported');
  };

  const handlePrint = () => {
    const rows = buildRows();
    if (!rows.length) return toast.warning('No data to print');
    const printData = rows.map(r => ({
      ...r,
      'Gross': typeof r.Gross === 'number' ? formatCurrency(r.Gross) : r.Gross,
      'TDS': typeof r.TDS === 'number' ? formatCurrency(r.TDS) : r.TDS,
      'Net': typeof r.Net === 'number' ? formatCurrency(r.Net) : r.Net,
      'TDS %': r['TDS %'] ? `${r['TDS %']}%` : '-',
    }));
    printData.push({
      'Date': 'TOTAL', 'Payment Type': '', 'Vendor': '', 'Name': '', 'Mobile': '', 'Mode': '',
      'Gross': formatCurrency(totals.gross), 'TDS %': '', 'TDS': formatCurrency(totals.tds),
      'Net': formatCurrency(totals.net), 'Bank': '', 'Reference': '', 'Status': '',
      'Notes': `${totals.count} payments`,
    } as any);
    const subtitle = [
      typeFilter !== 'all' ? `Type: ${typeMap[typeFilter]}` : 'All Types',
      vendorFilter ? `Vendor: ${vendorMap[vendorFilter]?.vendor_name}` : null,
      dateFrom || dateTo ? `Period: ${dateFrom || '...'} to ${dateTo || '...'}` : null,
    ].filter(Boolean).join(' | ');
    printReport({
      title: 'Quick Payment Report',
      subtitle,
      columns: [
        { label: 'Date', key: 'Date' },
        { label: 'Type', key: 'Payment Type' },
        { label: 'Vendor', key: 'Vendor' },
        { label: 'Name', key: 'Name' },
        { label: 'Mode', key: 'Mode' },
        { label: 'Gross', key: 'Gross' },
        { label: 'TDS', key: 'TDS' },
        { label: 'Net', key: 'Net' },
        { label: 'Reference', key: 'Reference' },
        { label: 'Status', key: 'Status' },
      ],
      data: printData,
    });
  };

  const isVendorType = typeFilter !== 'all' && /vendor|contractor/i.test(typeMap[typeFilter] || '');
  const showVendorFilter = typeFilter === 'all' || isVendorType || vendorFilter;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" /> Quick Payment Report
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportExcel} disabled={loading || !filtered.length}>
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || !filtered.length}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
            <div>
              <label className="text-xs text-muted-foreground">Payment Type</label>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setVendorFilter(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map(t => <SelectItem key={t.id} value={t.id}>{t.type_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {showVendorFilter && (
              <div>
                <label className="text-xs text-muted-foreground">Vendor</label>
                <VendorSearchCombobox
                  items={vendors.map(v => ({ id: v.id, code: v.vendor_code, name: v.vendor_name }))}
                  value={vendorFilter}
                  onValueChange={setVendorFilter}
                  placeholder="All Vendors"
                  searchPlaceholder="Search vendor..."
                />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Name / mobile / ref" value={nameSearch} onChange={e => setNameSearch(e.target.value)} className="pl-8" />
              </div>
            </div>
          </div>

          {vendorFilter && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <Badge variant="secondary">Vendor: {vendorMap[vendorFilter]?.vendor_name}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setVendorFilter('')}>Clear</Button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Card><CardContent className="pt-4 text-center">
                  <div className="text-lg font-bold">{formatCurrency(totals.gross)}</div>
                  <p className="text-xs text-muted-foreground">Gross</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 text-center">
                  <div className="text-lg font-bold text-destructive">{formatCurrency(totals.tds)}</div>
                  <p className="text-xs text-muted-foreground">TDS</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 text-center">
                  <div className="text-lg font-bold text-primary">{formatCurrency(totals.net)}</div>
                  <p className="text-xs text-muted-foreground">Net</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4 text-center">
                  <div className="text-lg font-bold">{totals.count}</div>
                  <p className="text-xs text-muted-foreground">Payments</p>
                </CardContent></Card>
              </div>

              <div className="border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Name / Vendor</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right hidden md:table-cell">TDS</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(p => (
                      <TableRow key={p.id} className="cursor-pointer" onClick={() => setDrillDown(p)}>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(p.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                        <TableCell className="text-xs">{p.payment_type_id ? typeMap[p.payment_type_id] : '-'}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{p.vendor_id ? vendorMap[p.vendor_id]?.vendor_name || p.name : p.name}</div>
                          {p.mobile_number && <div className="text-xs text-muted-foreground">{p.mobile_number}</div>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{p.payment_mode || '-'}</Badge></TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(p.gross_amount || 0)}</TableCell>
                        <TableCell className="text-right text-sm text-destructive hidden md:table-cell">{formatCurrency(p.tds_amount || 0)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(p.net_amount || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={p.bank_advice_generated ? 'default' : 'secondary'} className="text-xs">
                            {p.bank_advice_generated ? 'Generated' : 'Pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No payments found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!drillDown} onOpenChange={() => setDrillDown(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setDrillDown(null)}><ArrowLeft className="h-4 w-4" /></Button>
              Payment Details
            </DialogTitle>
          </DialogHeader>
          {drillDown && (
            <div className="space-y-2 text-sm">
              {[
                ['Date', format(new Date(drillDown.created_at), 'dd/MM/yyyy HH:mm')],
                ['Type', drillDown.payment_type_id ? typeMap[drillDown.payment_type_id] : '-'],
                ['Vendor', drillDown.vendor_id ? vendorMap[drillDown.vendor_id]?.vendor_name : '-'],
                ['Name', drillDown.name],
                ['Mobile', drillDown.mobile_number || '-'],
                ['Mode', drillDown.payment_mode || '-'],
                ['Bank', drillDown.bank_name || '-'],
                ['Account', drillDown.account_number || '-'],
                ['Cheque #', drillDown.cheque_number || '-'],
                ['Gross', formatCurrency(drillDown.gross_amount || 0)],
                ['TDS', `${formatCurrency(drillDown.tds_amount || 0)} (${drillDown.tds_percentage || 0}%)`],
                ['Net', formatCurrency(drillDown.net_amount || 0)],
                ['Reference', drillDown.bank_advice_reference || '-'],
                ['Status', drillDown.bank_advice_generated ? 'Generated' : 'Pending'],
                ['Notes', drillDown.payment_notes || '-'],
              ].map(([k, v]) => (
                <div key={k as string} className="grid grid-cols-3 gap-2 border-b py-1">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="col-span-2 font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickPaymentReport;
