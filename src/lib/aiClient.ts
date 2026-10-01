/**
 * Browser-direct OpenAI-compatible Chat Completions client (bring your own key).
 *
 * - Talks to `${baseUrl}/chat/completions` only; the API key is sent ONLY there
 *   (as `Authorization: Bearer`), and only when a key is configured.
 * - No dependency on any Modellr backend.
 */
import { getAIConfig, normalizeBaseUrl, validateAIConfig, isLocalEndpoint, type AIConfig } from './aiConfig';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  signal?: AbortSignal;
  /** Overrides on top of the saved config (e.g. the unsaved values of the settings dialog). */
  config?: Partial<AIConfig>;
  /** Clamped to [1, MAX_TOKENS_LIMIT]. Default 800. */
  maxTokens?: number;
  temperature?: number;
  /** Ask for response_format json_object (silently dropped if the provider rejects it). */
  jsonMode?: boolean;
  /** Non-streaming only. Default 120s. */
  timeoutMs?: number;
}

export interface StreamOptions extends ChatOptions {
  onToken?: (token: string) => void;
}

export const DEFAULT_MAX_TOKENS = 800;
export const MAX_TOKENS_LIMIT = 8000;
export const MAX_MESSAGES = 40;
export const MAX_MESSAGE_CHARS = 100_000;

export type AIErrorKind =
  | 'config' | 'auth' | 'forbidden' | 'not_found' | 'rate_limit' | 'bad_request'
  | 'server' | 'network' | 'timeout' | 'empty' | 'http';

export class AIError extends Error {
  readonly kind: AIErrorKind;
  readonly status?: number;
  constructor(kind: AIErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'AIError';
    this.kind = kind;
    this.status = status;
  }
}

export function isAbortError(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { name?: string }).name === 'AbortError';
}

// ── SSE parsing (pure) ─────────────────────────────────────────────────────

export interface SSEParser {
  /** Feed decoded text (may end mid-line). */
  push(text: string): void;
  /** Flush a trailing unterminated line. */
  end(): void;
  readonly done: boolean;
}

/**
 * Incremental Server-Sent-Events parser. Keeps a line buffer across `push` calls,
 * understands LF / CRLF / CR (including a CRLF split across chunks), ignores
 * comments (`: keepalive`) and non-data fields, and stops at `data: [DONE]`.
 * Every `data:` line is delivered on its own (chat-completion payloads are one-line JSON),
 * which also tolerates servers that omit the blank line between events.
 */
export function createSSEParser(onData: (data: string) => void): SSEParser {
  let buf = '';
  let done = false;
  let first = true;

  const handleLine = (line: string) => {
    if (done || line === '' || line[0] === ':') return;
    const idx = line.indexOf(':');
    const field = idx === -1 ? line : line.slice(0, idx);
    if (field !== 'data') return;
    let value = idx === -1 ? '' : line.slice(idx + 1);
    if (value[0] === ' ') value = value.slice(1);
    if (value.trim() === '[DONE]') {
      done = true;
      return;
    }
    if (value !== '') onData(value);
  };

  return {
    push(text: string) {
      if (done) return;
      if (first && text) {
        first = false;
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      }
      buf += text;
      for (;;) {
        const m = /\r\n|\r|\n/.exec(buf);
        if (!m) break;
        // A trailing lone CR might be the first half of a CRLF: wait for more data.
        if (m[0] === '\r' && m.index + 1 === buf.length) break;
        const line = buf.slice(0, m.index);
        buf = buf.slice(m.index + m[0].length);
        handleLine(line);
        if (done) {
          buf = '';
          break;
        }
      }
    },
    end() {
      if (done) return;
      const rest = buf.replace(/\r$/, '');
      buf = '';
      handleLine(rest);
    },
    get done() {
      return done;
    },
  };
}

/**
 * Read a byte stream to completion, calling `onData` with the payload of each `data:` line.
 * Uses a streaming TextDecoder so multi-byte characters split across chunks survive.
 * Resolves `true` if `[DONE]` was seen, `false` if the stream just ended.
 * Errors thrown by `onData` (and read/abort errors) propagate; the reader is always released.
 */
export async function parseSSEStream(
  stream: ReadableStream<Uint8Array>,
  onData: (data: string) => void,
): Promise<boolean> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  const parser = createSSEParser(onData);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
      if (parser.done) {
        await reader.cancel().catch(() => {});
        return true;
      }
    }
    parser.push(decoder.decode()); // flush any dangling partial sequence
    parser.end();
    return parser.done;
  } catch (e) {
    await reader.cancel().catch(() => {});
    throw e;
  } finally {
    try { reader.releaseLock(); } catch { /* already released */ }
  }
}

// ── Requests ───────────────────────────────────────────────────────────────

function hostOf(baseUrl: string): string {
  try { return new URL(baseUrl).host; } catch { return baseUrl; }
}

function redact(text: string, key: string): string {
  return key && key.length >= 6 ? text.split(key).join('***') : text;
}

function resolveConfig(partial?: Partial<AIConfig>): AIConfig {
  const base = getAIConfig();
  const merged: AIConfig = {
    baseUrl: normalizeBaseUrl(partial?.baseUrl ?? base.baseUrl),
    apiKey: (partial?.apiKey ?? base.apiKey).trim(),
    model: (partial?.model ?? base.model).trim(),
  };
  const problem = validateAIConfig(merged);
  if (problem) throw new AIError('config', `${problem} Open AI settings to fix it.`);
  return merged;
}

export function sanitizeMessages(messages: ChatMessage[]): ChatMessage[] {
  const clean = messages
    .filter((m) => m && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.length > MAX_MESSAGE_CHARS ? m.content.slice(0, MAX_MESSAGE_CHARS) : m.content }));
  if (clean.length <= MAX_MESSAGES) return clean;
  // Keep the system prompt(s) and the most recent turns.
  const system = clean.filter((m) => m.role === 'system').slice(0, 2);
  const rest = clean.filter((m) => m.role !== 'system').slice(-(MAX_MESSAGES - system.length));
  return [...system, ...rest];
}

export function clampMaxTokens(n: number | undefined): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return DEFAULT_MAX_TOKENS;
  return Math.min(MAX_TOKENS_LIMIT, Math.max(1, Math.floor(n)));
}

function networkError(config: AIConfig): AIError {
  const host = hostOf(config.baseUrl);
  const local = isLocalEndpoint(config.baseUrl);
  return new AIError(
    'network',
    local
      ? `Could not reach ${host}. Is the local server running? If it is, the browser may be blocking the request (CORS): allow this site's origin (for Ollama set OLLAMA_ORIGINS) and check the base URL in AI settings.`
      : `Could not reach ${host}. Check your internet connection and the base URL in AI settings. Some providers block direct browser requests (CORS); if the URL is right, try a CORS-friendly provider such as OpenRouter or a local Ollama.`,
  );
}

function providerMessage(bodyText: string): string {
  const t = bodyText.trim();
  if (!t) return '';
  try {
    const j = JSON.parse(t);
    const m = j?.error?.message ?? (typeof j?.error === 'string' ? j.error : undefined) ?? j?.message ?? j?.detail;
    if (typeof m === 'string') return m;
  } catch { /* not JSON */ }
  return t.startsWith('<') ? '' : t.slice(0, 300);
}

function httpError(status: number, detail: string, config: AIConfig): AIError {
  const d = redact(detail, config.apiKey);
  const suffix = d ? ` Provider said: ${d}` : '';
  switch (status) {
    case 401:
      return new AIError('auth', `The API key was rejected (401). Check your API key and endpoint in AI settings.${suffix}`, status);
    case 403:
      return new AIError('forbidden', `Access denied (403). Your key may not have access to this model or region, or the provider refused the request. Check your key and endpoint.${suffix}`, status);
    case 404:
      return new AIError('not_found', `Endpoint or model not found (404). Check that the base URL is correct (usually ending in /v1) and that the model "${config.model}" exists${isLocalEndpoint(config.baseUrl) ? ' (for Ollama: ollama pull <model>)' : ''}.${suffix}`, status);
    case 429:
      return new AIError('rate_limit', `Rate limit or quota exceeded (429). Wait a moment and retry, or check your usage and billing with the provider.${suffix}`, status);
    case 400:
    case 422:
      return new AIError('bad_request', `The provider rejected the request (${status}). Check the model name in AI settings.${suffix}`, status);
    default:
      if (status >= 500) return new AIError('server', `The AI provider had a problem (${status}). Try again in a moment.${suffix}`, status);
      return new AIError('http', `The AI request failed (${status}).${suffix}`, status);
  }
}

interface Linked { signal: AbortSignal; dispose: () => void; timedOut: () => boolean }

function linkSignals(user: AbortSignal | undefined, timeoutMs?: number): Linked {
  const ctrl = new AbortController();
  let timedOut = false;
  const onAbort = () => ctrl.abort();
  if (user) {
    if (user.aborted) ctrl.abort();
    else user.addEventListener('abort', onAbort, { once: true });
  }
  const timer = timeoutMs
    ? setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs)
    : undefined;
  return {
    signal: ctrl.signal,
    timedOut: () => timedOut,
    dispose: () => {
      if (timer) clearTimeout(timer);
      user?.removeEventListener('abort', onAbort);
    },
  };
}

/** POST /chat/completions, adapting to providers that reject some parameters. */
async function send(config: AIConfig, opts: ChatOptions, stream: boolean, signal: AbortSignal): Promise<Response> {
  const body: Record<string, unknown> = {
    model: config.model,
    messages: sanitizeMessages(opts.messages),
    stream,
    max_tokens: clampMaxTokens(opts.maxTokens),
    temperature: opts.temperature ?? 0.4,
  };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (stream) headers.Accept = 'text/event-stream';
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  const url = `${config.baseUrl}/chat/completions`;

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
        redirect: 'error', // never let the key follow a redirect to another host
        credentials: 'omit',
      });
    } catch (e) {
      if (isAbortError(e)) throw e;
      throw networkError(config);
    }
    if (res.ok) return res;

    const text = await res.text().catch(() => '');
    const detail = providerMessage(text);
    if ((res.status === 400 || res.status === 422) && attempt < 3) {
      const m = detail.toLowerCase();
      if ('max_tokens' in body && m.includes('max_completion_tokens')) {
        body.max_completion_tokens = body.max_tokens;
        delete body.max_tokens;
        continue;
      }
      if ('temperature' in body && m.includes('temperature')) {
        delete body.temperature;
        continue;
      }
      if ('response_format' in body && (m.includes('response_format') || m.includes('json_object') || m.includes('json mode'))) {
        delete body.response_format;
        continue;
      }
    }
    throw httpError(res.status, detail, config);
  }
}

function contentOf(json: any): string {
  const c = json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.text;
  return typeof c === 'string' ? c : '';
}

/** Non-streaming chat completion. Resolves to the assistant text. */
export async function chat(opts: ChatOptions): Promise<string> {
  const config = resolveConfig(opts.config);
  const link = linkSignals(opts.signal, opts.timeoutMs ?? 120_000);
  try {
    const res = await send(config, opts, false, link.signal);
    let json: any;
    try {
      json = await res.json();
    } catch (e) {
      if (isAbortError(e)) throw e;
      throw new AIError('http', 'The endpoint did not return a valid chat completion. Check the base URL in AI settings (it should end in /v1).');
    }
    if (json?.error) {
      throw new AIError('http', redact(String(json.error.message ?? json.error), config.apiKey));
    }
    const text = contentOf(json);
    if (!text.trim()) throw new AIError('empty', 'The model returned an empty response. Try again or pick a different model.');
    return text;
  } catch (e) {
    if (isAbortError(e) && link.timedOut()) {
      throw new AIError('timeout', 'The AI request timed out. Try again, or use a faster model.');
    }
    throw e;
  } finally {
    link.dispose();
  }
}

/**
 * Streaming chat completion. Calls `onToken` for each content delta and resolves to the full text.
 * Aborting `signal` rejects with an `AbortError` (check with `isAbortError`).
 */
export async function streamChat(opts: StreamOptions): Promise<string> {
  const config = resolveConfig(opts.config);
  const link = linkSignals(opts.signal);
  let full = '';
  try {
    const res = await send(config, opts, true, link.signal);
    const type = res.headers.get('content-type') ?? '';

    // Some providers ignore stream:true and answer with a plain JSON completion.
    if (!res.body || type.includes('application/json')) {
      const json: any = await res.json().catch(() => null);
      if (json?.error) throw new AIError('http', redact(String(json.error.message ?? json.error), config.apiKey));
      full = contentOf(json);
      if (full) opts.onToken?.(full);
    } else {
      try {
        await parseSSEStream(res.body, (data) => {
          let json: any;
          try { json = JSON.parse(data); } catch { return; }
          if (json?.error) throw new AIError('http', redact(String(json.error.message ?? json.error), config.apiKey));
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta) {
            full += delta;
            opts.onToken?.(delta);
          }
        });
      } catch (e) {
        if (isAbortError(e) || e instanceof AIError) throw e;
        if (link.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        throw networkError(config);
      }
    }
    if (!full.trim()) throw new AIError('empty', 'The model returned an empty response. Try again or pick a different model.');
    return full;
  } finally {
    link.dispose();
  }
}

export type ConnectionResult = { ok: true; ms: number; reply: string } | { ok: false; message: string };

/** Used by the settings dialog's "Test connection" button. Never throws. */
export async function testConnection(config?: Partial<AIConfig>, signal?: AbortSignal): Promise<ConnectionResult> {
  const t0 = Date.now();
  try {
    const reply = await chat({
      config,
      signal,
      maxTokens: 16,
      temperature: 0,
      timeoutMs: 20_000,
      messages: [{ role: 'user', content: 'Reply with the single word: OK' }],
    });
    return { ok: true, ms: Date.now() - t0, reply: reply.trim().slice(0, 40) };
  } catch (e) {
    if (isAbortError(e)) return { ok: false, message: 'Cancelled.' };
    return { ok: false, message: e instanceof Error ? e.message : 'Connection failed.' };
  }
}

/** User-facing message for any error thrown by this module. */
export function errorMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return 'Something went wrong while talking to the AI provider.';
}
