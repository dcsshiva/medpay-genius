import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Download, Loader2, History, Search, Eye, Printer } from 'lucide-react';
import { printReport, autoFitColumns } from '@/lib/printUtils';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  changed_by: string | null;
  old_values: any;
  new_values: any;
  changed_at: string;
}

const TRACKED_TABLES = [
  { value: 'all', label: 'All Tables' },
  { value: 'payments', label: 'Payments' },
  { value: 'payment_releases', label: 'Payment Releases' },
  { value: 'staff', label: 'Staff' },
  { value: 'doctors', label: 'Doctors' },
  { value: 'leave_permission_applications', label: 'Leave Applications' },
  { value: 'quick_payments', label: 'Quick Payments' },
];

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'INSERT', label: 'Insert' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
];

const AuditTrailViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetchLogs();
  }, [tableFilter, actionFilter, dateFrom, dateTo, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('changed_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (tableFilter !== 'all') query = query.eq('table_name', tableFilter);
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      if (dateFrom) query = query.gte('changed_at', dateFrom + 'T00:00:00');
      if (dateTo) query = query.lte('changed_at', dateTo + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch (err: any) {
      toast.error('Failed to load audit logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Insert</Badge>;
      case 'UPDATE': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Update</Badge>;
      case 'DELETE': return <Badge variant="destructive">Delete</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getChangedFields = (old_values: any, new_values: any): string[] => {
    if (!old_values || !new_values) return [];
    return Object.keys(new_values).filter(
      key => JSON.stringify(old_values[key]) !== JSON.stringify(new_values[key])
        && key !== 'updated_at'
    );
  };

  const filteredLogs = searchTerm
    ? logs.filter(l =>
        l.table_name.includes(searchTerm.toLowerCase()) ||
        l.record_id.includes(searchTerm.toLowerCase()) ||
        (l.changed_by && l.changed_by.includes(searchTerm.toLowerCase()))
      )
    : logs;

  const exportToExcel = () => {
    const rows = filteredLogs.map(l => ({
      'Date/Time': format(new Date(l.changed_at), 'dd/MM/yyyy HH:mm:ss'),
      'Table': l.table_name,
      'Action': l.action,
      'Record ID': l.record_id,
      'Changed By': l.changed_by || 'System',
      'Changed Fields': l.action === 'UPDATE' ? getChangedFields(l.old_values, l.new_values).join(', ') : '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 10 }, { wch: 38 }, { wch: 38 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Trail');
    XLSX.writeFile(wb, `audit_trail_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Audit trail exported');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit Trail
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToExcel} disabled={loading}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const cols = [
                  { label: 'Date/Time', key: 'Date/Time' },
                  { label: 'Table', key: 'Table' },
                  { label: 'Action', key: 'Action' },
                  { label: 'Record ID', key: 'Record ID' },
                  { label: 'Changed By', key: 'Changed By' },
                ];
                const data = filteredLogs.map(l => ({
                  'Date/Time': format(new Date(l.changed_at), 'dd/MM/yyyy HH:mm:ss'),
                  'Table': l.table_name,
                  'Action': l.action,
                  'Record ID': l.record_id,
                  'Changed By': l.changed_by || 'System',
                }));
                printReport({ title: 'Audit Trail', columns: cols, data });
              }} disabled={loading}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={tableFilter} onValueChange={v => { setTableFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRACKED_TABLES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }} className="w-auto" placeholder="From" />
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }} className="w-auto" placeholder="To" />
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 w-[180px]"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="border rounded-md overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Date/Time</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead className="w-[90px]">Action</TableHead>
                      <TableHead className="hidden md:table-cell">Changed Fields</TableHead>
                      <TableHead className="w-[60px]">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map(log => {
                      const changed = log.action === 'UPDATE' ? getChangedFields(log.old_values, log.new_values) : [];
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">{format(new Date(log.changed_at), 'dd/MM/yy HH:mm')}</TableCell>
                          <TableCell className="text-xs font-mono">{log.table_name}</TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {log.action === 'UPDATE' ? changed.slice(0, 3).join(', ') + (changed.length > 3 ? ` +${changed.length - 3} more` : '') : '-'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit logs found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">Page {page + 1}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={filteredLogs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && getActionBadge(selectedLog.action)}
              <span className="font-mono text-sm">{selectedLog?.table_name}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Time:</span> {format(new Date(selectedLog.changed_at), 'dd/MM/yyyy HH:mm:ss')}</div>
                <div><span className="text-muted-foreground">Record ID:</span> <span className="font-mono text-xs">{selectedLog.record_id}</span></div>
                <div><span className="text-muted-foreground">Changed By:</span> <span className="font-mono text-xs">{selectedLog.changed_by || 'System'}</span></div>
              </div>

              {selectedLog.action === 'UPDATE' && selectedLog.old_values && selectedLog.new_values && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Changes:</h4>
                  <div className="border rounded-md divide-y max-h-[300px] overflow-auto">
                    {getChangedFields(selectedLog.old_values, selectedLog.new_values).map(field => (
                      <div key={field} className="p-2 text-xs">
                        <div className="font-medium mb-1">{field}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-1.5 bg-red-50 rounded text-red-700 break-all">
                            {JSON.stringify(selectedLog.old_values[field]) ?? 'null'}
                          </div>
                          <div className="p-1.5 bg-green-50 rounded text-green-700 break-all">
                            {JSON.stringify(selectedLog.new_values[field]) ?? 'null'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.action === 'INSERT' && selectedLog.new_values && (
                <div>
                  <h4 className="font-medium text-sm mb-2">New Record:</h4>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.action === 'DELETE' && selectedLog.old_values && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Deleted Record:</h4>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditTrailViewer;
