import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, BookOpen, Save, X, ThumbsUp, ThumbsDown, ArrowUpFromLine } from 'lucide-react';
import { toast } from 'sonner';

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
  created_at: string;
  usage_count?: number;
}

interface InteractionEntry {
  question: string;
  count: number;
  positive: number;
  negative: number;
  latest_response: string;
}

const ChatbotKnowledgeBase: React.FC = () => {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [interactions, setInteractions] = useState<InteractionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInteractions, setLoadingInteractions] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: '', answer: '', category: 'general' });

  const fetchEntries = async () => {
    setLoading(true);
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

  const fetchInteractions = async () => {
    setLoadingInteractions(true);
    const { data, error } = await supabase
      .from('chatbot_interactions')
      .select('question, ai_response, feedback_rating')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load interactions:', error);
      setLoadingInteractions(false);
      return;
    }

    // Aggregate by question
    const map = new Map<string, InteractionEntry>();
    ((data as any[]) || []).forEach((row: any) => {
      const q = row.question?.trim().toLowerCase();
      if (!q) return;
      const existing = map.get(q) || { question: row.question, count: 0, positive: 0, negative: 0, latest_response: row.ai_response };
      existing.count++;
      if (row.feedback_rating === 1) existing.positive++;
      if (row.feedback_rating === -1) existing.negative++;
      map.set(q, existing);
    });

    // Sort by frequency
    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
    setInteractions(sorted);
    setLoadingInteractions(false);
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

  const handlePromote = (interaction: InteractionEntry) => {
    setForm({
      question: interaction.question,
      answer: interaction.latest_response,
      category: 'learned',
    });
    setEditingId(null);
    setShowForm(true);
    toast.info('Review and edit the answer before saving to knowledge base');
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

      <Tabs defaultValue="entries" onValueChange={(v) => { if (v === 'frequent') fetchInteractions(); }}>
        <TabsList>
          <TabsTrigger value="entries">Knowledge Entries</TabsTrigger>
          <TabsTrigger value="frequent">Frequent Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-3 mt-4">
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
            entries.map(entry => (
              <Card key={entry.id} className={!entry.is_active ? 'opacity-60' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">{entry.category}</Badge>
                        {!entry.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                        {(entry.usage_count ?? 0) > 0 && (
                          <Badge variant="outline" className="text-xs">Used {entry.usage_count}x</Badge>
                        )}
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
            ))
          )}
        </TabsContent>

        <TabsContent value="frequent" className="space-y-3 mt-4">
          {loadingInteractions ? (
            <p className="text-muted-foreground">Loading interactions...</p>
          ) : interactions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No user interactions recorded yet. Feedback data will appear here once users rate chatbot responses.</p>
              </CardContent>
            </Card>
          ) : (
            interactions.map((item, idx) => (
              <Card key={idx}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">{item.count}x asked</Badge>
                        {item.positive > 0 && (
                          <Badge variant="outline" className="text-xs text-green-600 flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" /> {item.positive}
                          </Badge>
                        )}
                        {item.negative > 0 && (
                          <Badge variant="outline" className="text-xs text-destructive flex items-center gap-1">
                            <ThumbsDown className="h-3 w-3" /> {item.negative}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-foreground text-sm">{item.question}</p>
                      <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{item.latest_response}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handlePromote(item)} title="Promote to knowledge base">
                      <ArrowUpFromLine className="h-4 w-4 mr-1" /> Promote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChatbotKnowledgeBase;
