import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export interface TaskNoteRequest {
  title: string;
  description?: string;
  noteLabel: string;
  confirmLabel: string;
  noteRequired?: boolean;
  destructive?: boolean;
  onConfirm: (note: string) => Promise<void>;
}

/** HRMS: small confirm dialog with a note, used for accept / reject / submit / close / reopen. */
const TaskNoteDialog: React.FC<{ request: TaskNoteRequest | null; onClose: () => void }> = ({ request, onClose }) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setNote(''); }, [request]);

  const confirm = async () => {
    if (!request) return;
    setBusy(true);
    try {
      await request.onConfirm(note);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!request} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{request?.title}</DialogTitle>
          {request?.description && <DialogDescription>{request.description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2">
          <Label>{request?.noteLabel}{request?.noteRequired ? ' *' : ' (optional)'}</Label>
          <Textarea rows={3} value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant={request?.destructive ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={busy || (!!request?.noteRequired && !note.trim())}
          >
            {busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {request?.confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskNoteDialog;
