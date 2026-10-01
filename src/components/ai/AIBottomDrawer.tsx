import { useState, useRef, useEffect } from 'react';
import { useSchemaStore } from '../../store/schema';
import { Bot, ChevronDown, Send, CheckCircle2, XCircle, Settings, Square } from 'lucide-react';
import { requestSchemaModifications } from '../../hooks/useAI';
import { isAbortError, errorMessage, type ChatMessage } from '../../lib/aiClient';
import { useAIConfigured } from '../../lib/aiConfig';
import type { AIOperation } from '../../lib/aiPrompts';
import { AISettingsDialog } from './AISettingsDialog';
import './AIBottomDrawer.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  operations?: AIOperation[];
  applied?: boolean;
  isError?: boolean;
}

const INITIAL: Message = {
  id: 'initial',
  role: 'assistant',
  content: 'What would you like to build today? You can ask me to "Add an auth system" or "Normalize my users table".',
};

export const AIBottomDrawer: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { tables, relationships, applyAIOperations } = useSchemaStore();
  const configured = useAIConfigured();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const nextId = () => `m${Date.now()}-${idRef.current++}`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.initialPrompt) setInput(detail.initialPrompt);
    };
    window.addEventListener('sf:open-ai-generate', handler);
    return () => window.removeEventListener('sf:open-ai-generate', handler);
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userPrompt = input.trim();
    setInput('');

    // Recent text-only turns give the model conversational context.
    const history: ChatMessage[] = messages
      .filter((m) => m.id !== 'initial' && m.content && !m.isError)
      .map((m) => ({ role: m.role, content: m.content as string }));

    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: userPrompt }]);
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const result = await requestSchemaModifications(userPrompt, tables, relationships, { history, signal: ctrl.signal });
      let content = result.analysis;
      if (!content) content = result.operations.length ? 'Here are the proposed changes.' : 'No changes needed.';
      if (result.dropped > 0) {
        content += ` (${result.dropped} invalid ${result.dropped === 1 ? 'change was' : 'changes were'} ignored.)`;
      }
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', content, operations: result.operations, applied: false },
      ]);
    } catch (err) {
      if (!isAbortError(err)) {
        setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: errorMessage(err), isError: true }]);
      }
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setLoading(false);
    }
  };

  const handleStop = () => abortRef.current?.abort();

  const applyOperations = (msgId: string, ops: AIOperation[]) => {
    applyAIOperations(ops);
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m)));
  };

  if (!isOpen) return null;

  return (
    <div className="ai-drawer">
      <div className="ai-drawer__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Bot size={18} color="#A09AEB" /> Modellr AI
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className="ai-drawer__close" onClick={() => setSettingsOpen(true)} title="AI settings" aria-label="AI settings">
            <Settings size={16} />
          </button>
          <button className="ai-drawer__close" onClick={onClose} aria-label="Close">
            <ChevronDown size={20} />
          </button>
        </div>
      </div>

      {!configured ? (
        <div className="ai-drawer__chat">
          <div className="ai-setup-cta">
            <strong>Set up AI (bring your own key)</strong>
            <span>
              Modellr AI runs on your own AI provider. Add an OpenAI or OpenRouter key, or point it at a local
              Ollama model. Your key stays in this browser and is sent only to the provider you choose.
            </span>
            <button onClick={() => setSettingsOpen(true)}>Set up AI</button>
          </div>
        </div>
      ) : (
        <>
          <div className="ai-drawer__chat">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message ai-message--${msg.role}`}>
                {msg.role === 'assistant' && <Bot className="ai-avatar" size={16} />}
                <div className="ai-bubble">
                  {msg.content && <p style={msg.isError ? { color: '#ff7b72' } : undefined}>{msg.content}</p>}

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
                              {op.action.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span>
                              {op.tableName} {op.fieldName ? `(${op.fieldName})` : ''}
                              {op.relationTargetTable ? ` → ${op.relationTargetTable}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="ai-diff-card__actions">
                        <button className="ai-btn-reject" onClick={() => setMessages((prev) => prev.filter((m) => m.id !== msg.id))}>
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
              onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
              placeholder="Ask AI to modify your database..."
              disabled={loading}
            />
            {loading ? (
              <button onClick={handleStop} className="ai-send-btn" title="Stop" aria-label="Stop">
                <Square size={16} />
              </button>
            ) : (
              <button onClick={handleSend} disabled={!input.trim()} className="ai-send-btn" aria-label="Send">
                <Send size={18} />
              </button>
            )}
          </div>
        </>
      )}

      <AISettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};
