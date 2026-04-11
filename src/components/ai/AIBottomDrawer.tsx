import React, { useState, useRef, useEffect } from 'react';
import { useSchemaStore } from '../../store/schema';
import { Bot, ChevronDown, Send, CheckCircle2, XCircle } from 'lucide-react';
import './AIBottomDrawer.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  operations?: any[];
  applied?: boolean;
}

export const AIBottomDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { tables, relationships, applyAIOperations } = useSchemaStore();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', role: 'assistant', content: 'What would you like to build today? You can ask me to "Add an auth system" or "Normalize my users table".' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.initialPrompt) {
        setInput(e.detail.initialPrompt);
      }
    };
    // Need to listen to this event locally to capture the detail load
    window.addEventListener('sf:open-ai-generate', handler as EventListener);
    return () => window.removeEventListener('sf:open-ai-generate', handler as EventListener);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userPrompt = input.trim();
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userPrompt };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    // In production, VITE_API_URL points to the EC2 backend.
    // In dev, fall back to the Vite proxy path.
    const apiBase = (import.meta as any).env?.VITE_API_URL ?? '';
    const endpoint = `${apiBase}/api/openai/modify`;

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          currentSchema: { tables, relationships }
        })
      });

      const data = await resp.json();

      if (!resp.ok) throw new Error(data.error || 'Failed to fetch AI response');

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response.analysis,
        operations: data.response.operations,
        applied: false
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const applyOperations = (msgId: string, ops: any[]) => {
    applyAIOperations(ops);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, applied: true } : m));
  };

  if (!isOpen) return null;

  return (
    <div className="ai-drawer">
      <div className="ai-drawer__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Bot size={18} color="#A09AEB" /> Modellr AI
        </div>
        <button className="ai-drawer__close" onClick={onClose}>
          <ChevronDown size={20} />
        </button>
      </div>

      <div className="ai-drawer__chat">
        {messages.map(msg => (
          <div key={msg.id} className={`ai-message ai-message--${msg.role}`}>
            {msg.role === 'assistant' && <Bot className="ai-avatar" size={16} />}
            <div className="ai-bubble">
              {msg.content && <p>{msg.content}</p>}

              {/* Diff Card */}
              {msg.operations && msg.operations.length > 0 && !msg.applied && (
                <div className="ai-diff-card">
                  <div className="ai-diff-card__header">
                    <span>Proposed Structural Changes ({msg.operations.length})</span>
                  </div>
                  <div className="ai-diff-card__body">
                    {msg.operations.map((op, i) => (
                      <div key={i} className="ai-diff-item">
                        <span className={`ai-diff-badge ai-diff-badge--${op.action.split('_')[0]}`}>
                          {op.action.replace('_', ' ').toUpperCase()}
                        </span>
                        <span>
                          {op.tableName} {op.fieldName ? `(${op.fieldName})` : ''}
                          {op.relationTargetTable ? ` → ${op.relationTargetTable}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="ai-diff-card__actions">
                    <button className="ai-btn-reject" onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}>
                      <XCircle size={14} /> Reject
                    </button>
                    <button className="ai-btn-accept" onClick={() => applyOperations(msg.id, msg.operations!)}>
                      <CheckCircle2 size={14} /> Accept & Apply
                    </button>
                  </div>
                </div>
              )}
              {msg.applied && (
                <div className="ai-applied-badge">
                  <CheckCircle2 size={14} /> Changes applied to canvas
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="ai-message ai-message--assistant">
            <Bot className="ai-avatar" size={16} />
            <div className="ai-bubble ai-bubble--loading">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-drawer__input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AI to modify your database..."
          disabled={loading}
        />
        <button onClick={handleSend} disabled={!input.trim() || loading} className="ai-send-btn">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
