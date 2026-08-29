import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Sparkles, Smile } from 'lucide-react';
import { useAuthStore } from '../../stores';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  suggestions?: string[];
  features?: { title: string; description: string }[];
  categories?: string[];
  links?: { label: string; slug: string }[];
  stats?: { label: string; value: string }[];
  action?: { type: string; label: string; path: string };
}

const greeting = (): string => {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `Good ${timeOfDay}! I'm Core, your AI shopping assistant. How can I help you?`;
};

const defaultSuggestions = ['Website Features', 'Recommendations', 'How to Order', 'Track Order'];

export default function AIWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId] = useState(() => (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2));
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: greeting(), suggestions: defaultSuggestions },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isStaff = !!user && ['EMPLOYEE', 'MANAGER', 'ADMIN'].includes(user.role);

  useEffect(() => {
    setOpen(false);
    setMessages([{ role: 'bot', text: greeting(), suggestions: defaultSuggestions }]);
  }, [location.pathname]);

  const sendMessage = async (text: string) => {
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.data) {
        throw new Error(data?.message || 'The assistant is unavailable right now.');
      }
      const reply = data.data;

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: reply.reply || 'How can I help you?',
          suggestions: reply.suggestions,
          features: reply.features,
          categories: reply.categories,
          links: reply.links,
          stats: reply.stats,
          action: reply.action,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: error instanceof Error ? error.message : 'Sorry, I\'m having trouble right now. Please try again later.', suggestions: defaultSuggestions },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-all hover:bg-accent-hover sm:bottom-6 sm:right-6 ${!open ? 'animate-bounce' : ''}`}
        aria-label={open ? 'Close AI shopping assistant' : 'Open AI shopping assistant'}
        aria-expanded={open}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[min(500px,calc(100vh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-modal border border-border bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:bottom-24 sm:right-6 sm:w-96" role="dialog" aria-label="Core AI shopping assistant">
          <div className="bg-primary text-white px-4 py-3 flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            <div>
              <h3 className="font-semibold text-sm">Core</h3>
              <p className="text-xs text-white/60">{isStaff ? `${user?.role} Assistant` : 'AI Shopping Assistant'}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-sm'
                    : 'bg-gray-100 text-text dark:bg-gray-700 dark:text-gray-100 rounded-bl-sm'
                }`}>
                  {msg.role === 'bot' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Smile size={12} className="text-accent" />
                      <span className="text-xs font-semibold text-accent">Core</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {msg.stats && msg.stats.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {msg.stats.map((s, idx) => (
                        <div key={idx} className="bg-white/50 dark:bg-gray-700/60 rounded-lg p-2 text-center">
                          <p className="text-base font-bold">{s.value}</p>
                          <p className="text-[11px] text-text-muted dark:text-gray-400">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.links && msg.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.links.map((l, idx) => (
                        <button
                          key={idx}
                          onClick={() => navigate(`/product/${l.slug}`)}
                          className="text-xs bg-accent/10 text-accent border border-accent/30 rounded-full px-3 py-1 hover:bg-accent hover:text-white transition-colors"
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.features && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {msg.features.map((f, idx) => (
                        <div key={idx} className="bg-white/50 dark:bg-gray-700/60 rounded-lg p-2 text-center">
                          <p className="text-xs font-semibold">{f.title}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.categories && msg.categories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.categories.map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => navigate(`/category/${c}`)}
                          className="text-xs bg-accent/10 text-accent border border-accent/30 rounded-full px-3 py-1 hover:bg-accent hover:text-white transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.action && (
                    <div className="mt-2">
                      <button
                        onClick={() => navigate(msg.action!.path)}
                        className="text-xs bg-accent text-white rounded-full px-3 py-1.5 hover:bg-accent-hover transition-colors"
                      >
                        {msg.action.label}
                      </button>
                    </div>
                  )}

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(s)}
                          className="text-xs bg-white dark:bg-gray-700 dark:text-gray-100 border border-border dark:border-gray-600 rounded-full px-3 py-1 hover:bg-accent hover:text-white hover:border-accent transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t border-border dark:border-gray-700 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isStaff ? "Ask Core about store data..." : "Ask Core anything..."}
              className="flex-1 px-3 py-2 border border-border dark:border-gray-600 rounded-btn text-sm bg-white dark:bg-gray-800 text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button type="submit" className="btn-primary !px-3 !py-2" disabled={!input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
