import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Trash2, Mic, MicOff, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { toast } from 'sonner';
import { isStaffOnlyScreen } from '@/lib/staffOnlyScreens';

type Message = { role: 'user' | 'assistant'; content: string; id?: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`;

// Map of navigation labels (lowercase) to tab IDs
const NAV_LABEL_TO_TAB: Record<string, string> = {
  'dashboard': 'dashboard',
  'user guide': 'user-guide',
  'masters': 'masters',
  'staff management': 'staff',
  'doctor management': 'doctors',
  'visit management': 'visits',
  'doctor hub': 'doctor-hub',
  'cash payments (lite)': 'cash-payments-lite',
  'insurance payments (lite)': 'insurance-payments-lite',
  'quick payment': 'quick-payment',
  'bank advice (beta)': 'bank-advice-generation-beta',
  'bank advice (legacy)': 'bank-advice-generation',
  'bank advice hub': 'bank-advice-history',
  'bank advice records': 'bank-advice-records',
  'tds reports': 'tds-reports',
  'cash payments': 'cash-payments',
  'insurance payments': 'insurance-payments',
  'ba payment report': 'bank-advice-payment-report',
  'quick payment ba report': 'quick-payment-bank-advice-report',
  'task management': 'tasks',
  'my tasks': 'tasks',
  'staff appraisals': 'appraisals',
  'leave approvals': 'leave-approvals',
  'leave & permission': 'leave-permission',
  'complaint management': 'complaints',
  'complaints': 'complaints',
  'login reports': 'login-reports',
  'navigation analytics': 'navigation-analytics',
  'team chat': 'chat',
  'version management': 'version',
  'website settings': 'website-settings',
  'ai knowledge base': 'ai-knowledge-base',
  'settings': 'settings',
};

interface AIChatbotProps {
  onTabChange?: (tab: string) => void;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ onTabChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { userRole, userDesignation, user } = useAuth();

  // Voice input hook
  const { isListening, isSupported: voiceSupported, startListening, stopListening } = useVoiceInput({
    lang: 'ta-IN',
    onTranscript: (text) => setInput(text),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Process AI text to convert [[Menu Name]] to clickable elements
  const processContent = useCallback((text: string): string => {
    return text.replace(/\[\[([^\]]+)\]\]/g, (_, label) => {
      const tabId = NAV_LABEL_TO_TAB[label.toLowerCase().trim()];
      if (tabId && isStaffOnlyScreen(tabId)) {
        return `[📌 ${label}](nav://${tabId})`;
      }
      return `**${label}**`;
    });
  }, []);

  const handleNavClick = useCallback((tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
      setIsOpen(false);
    }
  }, [onTabChange]);

  const handleFeedback = useCallback(async (msgIndex: number, rating: number) => {
    if (feedbackGiven[msgIndex] || !user?.id) return;
    
    // Find the user question (previous message)
    const aiMsg = messages[msgIndex];
    const userMsg = messages[msgIndex - 1];
    if (!aiMsg || !userMsg || aiMsg.role !== 'assistant' || userMsg.role !== 'user') return;

    setFeedbackGiven(prev => ({ ...prev, [msgIndex]: rating }));

    try {
      await supabase.from('chatbot_interactions').insert({
        user_id: user.id,
        question: userMsg.content,
        ai_response: aiMsg.content,
        feedback_rating: rating,
      } as any);
    } catch (err) {
      console.error('Failed to log feedback:', err);
    }
  }, [messages, feedbackGiven, user]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // Stop voice if listening
    if (isListening) stopListening();

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.message || 'Something went wrong. Please try again.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Custom link renderer for ReactMarkdown
  const markdownComponents = {
    a: ({ href, children, ...props }: any) => {
      // Handle nav:// protocol links
      if (href?.startsWith('nav://') && isStaffOnlyScreen(href.replace('nav://', ''))) {
        const tabId = href.replace('nav://', '');
        return (
          <button
            onClick={() => handleNavClick(tabId)}
            className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:text-primary/80 font-medium cursor-pointer bg-transparent border-none p-0"
          >
            {children}
          </button>
        );
      }
      if (href?.startsWith('nav://')) return <span>{children}</span>;
      // Handle internal routes (starting with /)
      if (href?.startsWith('/')) {
        return (
          <button
            onClick={() => {
              if (onTabChange) {
                const segment = href.replace(/^\//, '').split('/')[0];
                const tabId = NAV_LABEL_TO_TAB[segment] || segment;
                if (isStaffOnlyScreen(tabId)) onTabChange(tabId);
                setIsOpen(false);
              }
            }}
            className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:text-primary/80 font-medium cursor-pointer bg-transparent border-none p-0"
          >
            {children}
          </button>
        );
      }
      return <a href={href} {...props} target="_blank" rel="noopener noreferrer">{children}</a>;
    },
  };

  const roleLabel = userDesignation || userRole || 'user';

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-105"
          aria-label="Open AI Assistant"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <h3 className="text-sm font-semibold">WestMed Assistant</h3>
                <p className="text-xs opacity-80">Ask about the HMS</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setMessages([]); setFeedbackGiven({}); }} className="p-1.5 rounded-md hover:bg-primary-foreground/20 transition-colors" title="Clear chat">
                <Trash2 className="h-4 w-4" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-primary-foreground/20 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8 space-y-2">
                <Bot className="h-10 w-10 mx-auto opacity-40" />
                <p className="font-medium">Hi! I'm your WestMed HMS Assistant.</p>
                 <p className="text-xs">Ask me about staff, attendance, leave, tasks, payroll or reports. ({roleLabel})</p>
                {voiceSupported && (
                  <p className="text-xs opacity-70">🎙️ Tamil voice input supported</p>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%]">
                  <div className={`rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                        <ReactMarkdown
                          urlTransform={(url) => {
                            if (url.startsWith('nav://')) return url;
                            return url;
                          }}
                          components={markdownComponents}
                        >
                          {processContent(msg.content)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {/* Feedback buttons for assistant messages */}
                  {msg.role === 'assistant' && !isLoading && (
                    <div className="flex items-center gap-1 mt-1 ml-1">
                      <button
                        onClick={() => handleFeedback(i, 1)}
                        disabled={!!feedbackGiven[i]}
                        className={`p-1 rounded transition-colors ${
                          feedbackGiven[i] === 1
                            ? 'text-green-600'
                            : feedbackGiven[i]
                              ? 'text-muted-foreground/30 cursor-not-allowed'
                              : 'text-muted-foreground hover:text-green-600'
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleFeedback(i, -1)}
                        disabled={!!feedbackGiven[i]}
                        className={`p-1 rounded transition-colors ${
                          feedbackGiven[i] === -1
                            ? 'text-destructive'
                            : feedbackGiven[i]
                              ? 'text-muted-foreground/30 cursor-not-allowed'
                              : 'text-muted-foreground hover:text-destructive'
                        }`}
                        title="Not helpful"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice indicator */}
          {isListening && (
            <div className="px-3 py-1.5 bg-destructive/10 text-destructive text-xs flex items-center gap-2 flex-shrink-0">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              Listening... (Tamil)
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-3 flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about WestMed HMS..."
                rows={1}
                className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-h-20"
              />
              {voiceSupported && (
                <Button
                  size="icon"
                  variant={isListening ? 'destructive' : 'outline'}
                  onClick={toggleVoice}
                  className="h-9 w-9 rounded-lg flex-shrink-0"
                  title={isListening ? 'Stop listening' : 'Voice input (Tamil)'}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="h-9 w-9 rounded-lg flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
