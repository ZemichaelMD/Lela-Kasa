import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Sparkles, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '@/lib/i18n';
import { sdk } from '@/lib/sdk';
import type { ChatMessageResponse } from '@/sdk/resources/chatbot';
import type { Components } from 'react-markdown';

const mdComponents: Components = {
  p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-1 list-disc pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-1 list-decimal pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[10px]">{children}</code>,
  pre: ({ children }) => <pre className="mb-1 overflow-x-auto rounded bg-muted/60 p-2 text-[10px] last:mb-0">{children}</pre>,
};

function ChatMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown components={mdComponents} remarkPlugins={[remarkGfm]}>
      {children}
    </ReactMarkdown>
  );
}

type UIMessage =
  | { role: 'user'; text: string; id: string }
  | { role: 'ai'; text: string; id: string }
  | { role: 'confirmation'; sessionId: string; message: string; id: string }
  | { role: 'clarify'; question: string; options?: string[]; id: string }
  | { role: 'error'; text: string; id: string }
  | { role: 'success'; text: string; id: string };

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

const SUGGESTIONS = [
  '🧾 Tigist took 5 boxes of Harar and paid 250',
  '💰 Tigist paid 500 birr via bank',
  '👤 How much does Tigist owe?',
  '📦 What is low on stock?',
  '📊 What happened today?',
];

function BotAvatar({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'h-7 w-7' : 'h-6 w-6';
  const icon = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-strong text-white shadow-sm`}
    >
      <Bot className={icon} />
    </div>
  );
}

export function ChatFab() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState(generateId());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  // ── Drag state ──────────────────────────────────────────────────────────────
  const [pos, setPos] = useState(() => {
    const saved = localStorage.getItem('kasa_chat_pos');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (typeof p.x === 'number' && typeof p.y === 'number') return p;
      } catch {}
    }
    // default: near-bottom right, but higher than before
    return { x: window.innerWidth - 64, y: window.innerHeight - 160 };
  });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const savePosition = useCallback((p: { x: number; y: number }) => {
    try { localStorage.setItem('kasa_chat_pos', JSON.stringify(p)); } catch {}
  }, []);

  const clampPos = useCallback((x: number, y: number) => ({
    x: Math.max(0, Math.min(x, window.innerWidth - 48)),
    y: Math.max(0, Math.min(y, window.innerHeight - 48)),
  }), []);

  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!isDragging.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const newPos = clampPos(
        clientX - dragOffset.current.x,
        clientY - dragOffset.current.y,
      );
      setPos(newPos);
      savePosition(newPos);
    }
    function onUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      setDragging(false);
      // if barely moved, treat as click
      const dx = Math.abs(pos.x - dragStartPos.current.x);
      const dy = Math.abs(pos.y - dragStartPos.current.y);
      if (dx < 5 && dy < 5) {
        setOpen(o => !o);
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, [clampPos, pos, savePosition]);

  const startDrag = (clientX: number, clientY: number) => {
    isDragging.current = true;
    setDragging(true);
    dragOffset.current = { x: clientX - pos.x, y: clientY - pos.y };
    dragStartPos.current = { x: pos.x, y: pos.y };
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    async function check() {
      try {
        const [c, vis] = await Promise.all([
          sdk.chatbot.getConfig(),
          sdk.shops.getSetting('chat_bubble_visible').catch(() => null),
        ]);
        const globallyEnabled = c.enabled;
        const userDisabled = vis === 'false';
        setEnabled(globallyEnabled && !userDisabled);
      } catch {
        setEnabled(false);
      }
    }
    void check();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const handleSend = async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: UIMessage = { role: 'user', text: text.trim(), id: generateId() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const response: ChatMessageResponse = await sdk.chatbot.sendMessage(text.trim(), sessionId);

      if (response.type === 'answer') {
        setMessages((prev) => [...prev, { role: 'ai', text: response.message || '', id: generateId() }]);
      } else if (response.type === 'confirmation') {
        setMessages((prev) => [...prev, {
          role: 'confirmation',
          sessionId: response.sessionId,
          message: response.message || '',
          id: generateId(),
        }]);
        setSessionId(response.sessionId);
      } else if (response.type === 'clarify') {
        setMessages((prev) => [...prev, {
          role: 'clarify',
          question: response.question || '',
          options: response.options,
          id: generateId(),
        }]);
        setSessionId(response.sessionId);
      } else if (response.type === 'error') {
        setMessages((prev) => [...prev, { role: 'error', text: response.message || '', id: generateId() }]);
        setSessionId(response.sessionId);
      } else if (response.type === 'success') {
        setMessages((prev) => [...prev, { role: 'success', text: response.message || '', id: generateId() }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'error', text: t('error'), id: generateId() }]);
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async (confirm: boolean, msgSessionId: string) => {
    setSending(true);
    try {
      const response: ChatMessageResponse = await sdk.chatbot.confirm(msgSessionId, confirm);

      if (response.type === 'success') {
        setMessages((prev) => [...prev, { role: 'success', text: response.message || '', id: generateId() }]);
      } else if (response.type === 'answer') {
        setMessages((prev) => [...prev, { role: 'ai', text: response.message || '', id: generateId() }]);
      } else if (response.type === 'error') {
        setMessages((prev) => [...prev, { role: 'error', text: response.message || '', id: generateId() }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'error', text: t('error'), id: generateId() }]);
    } finally {
      setSending(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setSessionId(generateId());
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleClose = () => {
    setOpen(false);
    resetChat();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
    if (e.key === 'Escape') handleClose();
  };

  if (!enabled) return null;

  return (
    <>
      {/* Floating action button — draggable */}
      <button
        ref={fabRef}
        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
        onTouchStart={(e) => { e.preventDefault(); startDrag(e.touches[0].clientX, e.touches[0].clientY); }}
        className={`fixed z-50 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-strong text-white shadow-lg shadow-primary/30 transition-all ${dragging ? 'scale-110 cursor-grabbing' : 'cursor-grab hover:scale-105'} active:scale-95 ${open ? 'rotate-90' : ''}`}
        style={{ left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }}
        aria-label={t('title')}
      >
        {open ? <X className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={handleClose}
          />

          <div
            ref={panelRef}
            className="fixed inset-0 z-50 flex flex-col bg-card sm:inset-auto sm:h-[440px] sm:max-h-[70vh] sm:w-[20rem] sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl"
            style={window.innerWidth < 640 ? {} : {
              left: Math.max(8, Math.min(pos.x - 256, window.innerWidth - 336)),
              top: Math.max(8, pos.y - 460),
              right: 'auto',
              bottom: 'auto',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 rounded-t-none bg-gradient-to-r from-primary to-accent-strong px-3 py-2 text-white sm:rounded-t-2xl">
              <BotAvatar size="md" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xs font-semibold">{t('title')}</h2>
                <p className="flex items-center gap-1 text-[10px] text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Online
                </p>
              </div>
              <button
                onClick={resetChat}
                className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="New chat"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 px-3 py-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center px-1 py-4 text-center">
                  <BotAvatar size="md" />
                  <p className="mt-2 text-xs font-semibold text-foreground">
                    {t('title')}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t('helpIntro')}
                  </p>
                  <div className="mt-3 flex w-full flex-col gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="rounded-lg border border-border bg-card px-2.5 py-2 text-left text-[11px] text-foreground transition-colors hover:border-primary/40 hover:bg-accent active:scale-[0.99]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[82%] whitespace-pre-wrap rounded-xl rounded-br-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground shadow-sm">
                        {msg.text}
                      </div>
                    </div>
                  );
                }
                if (msg.role === 'ai') {
                  return (
                    <div key={msg.id} className="flex items-end gap-1.5">
                      <BotAvatar />
                      <div className="max-w-[82%] rounded-xl rounded-bl-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground shadow-sm">
                        <ChatMarkdown>{msg.text}</ChatMarkdown>
                      </div>
                    </div>
                  );
                }
                if (msg.role === 'confirmation') {
                  return (
                    <div key={msg.id} className="flex items-end gap-1.5">
                      <BotAvatar />
                      <div className="w-full max-w-[88%] rounded-xl rounded-bl-md border border-primary/30 bg-primary/5 px-2.5 py-2.5 text-xs">
                        <div className="mb-2 text-foreground">
                          <ChatMarkdown>{msg.message}</ChatMarkdown>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirm(true, msg.sessionId)}
                            disabled={sending}
                            className="flex-1 rounded-lg bg-primary px-2 py-1.5 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                          >
                            {t('confirm')}
                          </button>
                          <button
                            onClick={() => handleConfirm(false, msg.sessionId)}
                            disabled={sending}
                            className="flex-1 rounded-lg border border-border bg-card px-2 py-1.5 text-[11px] font-semibold transition-colors hover:bg-accent disabled:opacity-50"
                          >
                            {t('cancel')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                if (msg.role === 'clarify') {
                  return (
                    <div key={msg.id} className="flex items-end gap-1.5">
                      <BotAvatar />
                      <div className="w-full max-w-[88%] rounded-xl rounded-bl-md border border-border bg-card px-2.5 py-2.5 text-xs">
                        <div className="mb-1.5 text-foreground"><ChatMarkdown>{msg.question}</ChatMarkdown></div>
                        {msg.options && msg.options.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {msg.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => handleSend(opt)}
                                className="rounded-full border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                if (msg.role === 'error') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="max-w-[90%] rounded-lg border border-destructive/20 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
                        {msg.text}
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className="flex items-end gap-1.5">
                    <BotAvatar />
                    <div className="max-w-[82%] rounded-xl rounded-bl-md border border-success/25 bg-success/10 px-2.5 py-1.5 text-xs text-success">
                      <ChatMarkdown>{msg.text}</ChatMarkdown>
                    </div>
                  </div>
                );
              })}

              {sending && (
                <div className="flex items-end gap-1.5">
                  <BotAvatar />
                  <div className="flex gap-1 rounded-xl rounded-bl-md border border-border bg-card px-2.5 py-2 shadow-sm">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/60"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border bg-card px-2.5 py-2 sm:rounded-b-2xl">
              <div className="flex items-end gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder={t('placeholder')}
                  maxLength={500}
                  disabled={sending}
                  className="h-9 flex-1 rounded-full border border-border bg-background px-3 text-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={sending || !input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent-strong text-white shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  aria-label="Send"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              {input.length > 400 && (
                <p className="mt-0.5 pr-1 text-right text-[10px] text-muted-foreground">
                  {500 - input.length}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
