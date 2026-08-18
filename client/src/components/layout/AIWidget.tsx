import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Sparkles, Smile } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  suggestions?: string[];
  features?: { title: string; description: string }[];
  categories?: string[];
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: greeting(), suggestions: defaultSuggestions },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const reply = data.data;

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: reply.reply || 'How can I help you?',
          suggestions: reply.suggestions,
          features: reply.features,
          categories: reply.categories,
          action: reply.action,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Sorry, I\'m having trouble right now. Please try again later.', suggestions: defaultSuggestions },
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
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-white shadow-lg hover:bg-accent-hover transition-all flex items-center justify-center ${!open ? 'animate-bounce' : ''}`}
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-modal shadow-2xl border border-border flex flex-col overflow-hidden">
          <div className="bg-primary text-white px-4 py-3 flex items-center gap-2">
            <Sparkles size={18} className="text-accent" />
            <div>
              <h3 className="font-semibold text-sm">Core</h3>
              <p className="text-xs text-white/60">AI Shopping Assistant</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-accent text-white rounded-br-sm'
                    : 'bg-gray-100 text-text rounded-bl-sm'
                }`}>
                  {msg.role === 'bot' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Smile size={12} className="text-accent" />
                      <span className="text-xs font-semibold text-accent">Core</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {msg.features && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {msg.features.map((f, idx) => (
                        <div key={idx} className="bg-white/50 rounded-lg p-2 text-center">
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
                          onClick={() => navigate(`/products?category=${c}`)}
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
                          className="text-xs bg-white border border-border rounded-full px-3 py-1 hover:bg-accent hover:text-white hover:border-accent transition-colors"
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
                <div className="bg-gray-100 rounded-xl px-4 py-3 rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Core anything..."
              className="flex-1 px-3 py-2 border border-border rounded-btn text-sm focus:outline-none focus:ring-2 focus:ring-accent"
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
