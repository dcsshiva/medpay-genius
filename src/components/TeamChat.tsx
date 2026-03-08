import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Send, MessageCircle, Users, Search, ArrowDown,
  Pencil, Trash2, X, Check
} from 'lucide-react';
import { formatDistanceToNowIST, formatInIST } from '@/lib/dateUtils';
import { isToday, isYesterday } from 'date-fns';
import { toIST } from '@/lib/dateUtils';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

const TeamChat = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewMessageCount(0);
    isAtBottomRef.current = true;
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const viewport = target.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!viewport) return;
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    const atBottom = scrollHeight - scrollTop - clientHeight < 80;
    isAtBottomRef.current = atBottom;
    setShowScrollBottom(!atBottom);
    if (atBottom) setNewMessageCount(0);
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        toast({ title: "Error", description: "Failed to load messages", variant: "destructive" });
        return;
      }
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !userRole || sending) return;

    setSending(true);
    try {
      const dbRole = ['admin', 'manager', 'doctor'].includes(userRole)
        ? userRole as 'admin' | 'manager' | 'doctor'
        : 'staff' as const;

      let senderName = user.user_metadata?.full_name;
      if (!senderName) {
        const { data: staffData } = await supabase
          .from('staff')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();
        senderName = staffData?.full_name || user.email || 'Unknown';
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          content: newMessage.trim(),
          sender_id: user.id,
          sender_name: senderName,
          sender_role: dbRole,
        }]);

      if (error) {
        console.error('Error sending message:', error);
        toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
        return;
      }
      setNewMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  // Edit message
  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const saveEdit = async () => {
    if (!editContent.trim() || !editingMessageId) return;
    const { error } = await supabase
      .from('messages')
      .update({ content: editContent.trim(), is_edited: true, updated_at: new Date().toISOString() })
      .eq('id', editingMessageId);
    if (error) {
      toast({ title: "Error", description: "Failed to edit message", variant: "destructive" });
    }
    cancelEditing();
  };

  // Delete message
  const confirmDelete = async () => {
    if (!deleteMessageId) return;
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', deleteMessageId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete message", variant: "destructive" });
    } else {
      setMessages(prev => prev.filter(m => m.id !== deleteMessageId));
    }
    setDeleteMessageId(null);
  };

  const canDeleteMessage = (msg: Message) => {
    if (!user) return false;
    if (msg.sender_id === user.id) return true;
    if (userRole === 'admin' || userRole === 'manager') return true;
    return false;
  };

  // Date separator logic
  const getDateLabel = (dateStr: string) => {
    const d = toIST(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return formatInIST(dateStr, 'EEEE, MMM dd, yyyy');
  };

  const shouldShowDateSeparator = (idx: number, msgs: Message[]) => {
    if (idx === 0) return true;
    const curr = toIST(msgs[idx].created_at);
    const prev = toIST(msgs[idx - 1].created_at);
    return curr.toDateString() !== prev.toDateString();
  };

  // Presence: unique senders in last 5 min
  const activeSenders = React.useMemo(() => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const unique = new Set<string>();
    messages.forEach(m => {
      if (new Date(m.created_at).getTime() > fiveMinAgo) {
        unique.add(m.sender_id);
      }
    });
    return unique.size;
  }, [messages]);

  // Filtered messages for search
  const filteredMessages = React.useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      m => m.content.toLowerCase().includes(q) || m.sender_name.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive';
      case 'manager': return 'bg-westmed-teal/10 text-westmed-teal';
      case 'doctor': return 'bg-primary/10 text-primary';
      case 'nurse': case 'technician': case 'receptionist': return 'bg-info/10 text-info';
      default: return 'bg-success/10 text-success';
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    if (!userRole) return;
    fetchMessages();

    const channel = supabase
      .channel('messages-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        if (!isAtBottomRef.current) {
          setNewMessageCount(c => c + 1);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.map(msg =>
          msg.id === payload.new.id ? payload.new as Message : msg
        ));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.filter(msg => msg.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userRole]);

  if (!userRole) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-muted-foreground text-center">Please log in to access the team chat.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <Card className="h-[calc(100vh-8rem)] md:h-[80vh] flex flex-col">
        {/* Header */}
        <CardHeader className="flex-shrink-0 p-4 md:p-6 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <MessageCircle className="h-5 w-5" />
              Team Chat
            </CardTitle>
            <div className="flex items-center gap-2">
              {activeSenders > 0 && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Users className="h-3 w-3" />
                  {activeSenders} active
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setShowSearch(!showSearch); setSearchQuery(''); }}
              >
                {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          {showSearch && (
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          )}
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
          <ScrollArea className="flex-1 p-4" onScrollCapture={handleScroll} ref={scrollAreaRef}>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <MessageCircle className="h-16 w-16 mb-4" />
                <p>{searchQuery ? 'No messages match your search.' : 'No messages yet. Start the conversation!'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMessages.map((message, idx) => {
                  const isOwn = message.sender_id === user?.id;
                  const showDate = !searchQuery && shouldShowDateSeparator(idx, filteredMessages);

                  return (
                    <React.Fragment key={message.id}>
                      {showDate && (
                        <div className="flex items-center gap-3 py-2">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs font-medium text-muted-foreground px-2">
                            {getDateLabel(message.created_at)}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}
                      <div className={`group flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {getInitials(message.sender_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{message.sender_name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleColor(message.sender_role)}`}>
                                {message.sender_role}
                              </span>
                            </div>

                            {editingMessageId === message.id ? (
                              <div className="space-y-2 w-full min-w-[200px]">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="min-h-[40px] text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                                    if (e.key === 'Escape') cancelEditing();
                                  }}
                                />
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-7 px-2">
                                    <X className="h-3 w-3 mr-1" /> Cancel
                                  </Button>
                                  <Button size="sm" onClick={saveEdit} className="h-7 px-2" disabled={!editContent.trim()}>
                                    <Check className="h-3 w-3 mr-1" /> Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="relative">
                                <div className={`rounded-lg px-4 py-2 ${
                                  isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                }`}>
                                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                  {message.is_edited && (
                                    <span className="text-xs opacity-70">(edited)</span>
                                  )}
                                </div>
                                {/* Action icons on hover */}
                                <div className={`absolute top-0 ${isOwn ? '-left-16' : '-right-16'} hidden group-hover:flex items-center gap-0.5`}>
                                  {isOwn && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditing(message)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {canDeleteMessage(message) && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteMessageId(message.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}

                            <span className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNowIST(message.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Scroll to bottom FAB */}
          {showScrollBottom && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-20 right-6 h-9 w-9 rounded-full shadow-lg z-10"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-4 w-4" />
              {newMessageCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {newMessageCount}
                </Badge>
              )}
            </Button>
          )}

          {/* Input area */}
          <div className="border-t p-4 flex-shrink-0">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                placeholder="Type your message... (Shift+Enter for new line)"
                value={newMessage}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                disabled={sending}
                className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm py-2"
                rows={1}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                size="icon"
                className="flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => { if (!open) setDeleteMessageId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The message will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamChat;
