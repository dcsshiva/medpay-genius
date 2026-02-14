import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, BookOpen, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

const ChatbotKnowledgeBase: React.FC = () => {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: '', answer: '', category: 'general' });

  const fetchEntries = async () => {
    setLoading(true);
    // Use rpc or direct query - admins have full read via RLS
    const { data, error } = await supabase
      .from('chatbot_knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load knowledge base');
      console.error(error);
    } else {
      setEntries((data as any[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('chatbot_knowledge_base')
        .update({ question: form.question, answer: form.answer, category: form.category } as any)
        .eq('id', editingId);
      if (error) { toast.error('Failed to update'); return; }
      toast.success('Entry updated');
    } else {
      const { error } = await supabase
        .from('chatbot_knowledge_base')
        .insert({ question: form.question, answer: form.answer, category: form.category } as any);
      if (error) { toast.error('Failed to add entry'); return; }
      toast.success('Entry added');
    }

    setForm({ question: '', answer: '', category: 'general' });
    setEditingId(null);
    setShowForm(false);
    fetchEntries();
  };

  const handleEdit = (entry: KnowledgeEntry) => {
    setForm({ question: entry.question, answer: entry.answer, category: entry.category });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge entry?')) return;
    const { error } = await supabase.from('chatbot_knowledge_base').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Entry deleted');
    fetchEntries();
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('chatbot_knowledge_base')
      .update({ is_active: !isActive } as any)
      .eq('id', id);
    if (error) { toast.error('Failed to toggle'); return; }
    fetchEntries();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> AI Knowledge Base
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Add Q&A pairs to teach the AI assistant about WestMed HMS specifics
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingId(null); setForm({ question: '', answer: '', category: 'general' }); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Entry
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? 'Edit' : 'New'} Knowledge Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Question</label>
              <Input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="How do I generate bank advice?" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Answer</label>
              <Textarea value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Step-by-step instructions..." rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Category</label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="general, payments, visits..." />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> {editingId ? 'Update' : 'Save'}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}><X className="h-4 w-4 mr-2" /> Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No knowledge entries yet. Add Q&A pairs to help the AI assistant.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <Card key={entry.id} className={!entry.is_active ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">{entry.category}</Badge>
                      {!entry.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                    <p className="font-medium text-foreground text-sm">{entry.question}</p>
                    <p className="text-muted-foreground text-sm mt-1 whitespace-pre-wrap">{entry.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch checked={entry.is_active} onCheckedChange={() => handleToggleActive(entry.id, entry.is_active)} />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatbotKnowledgeBase;
