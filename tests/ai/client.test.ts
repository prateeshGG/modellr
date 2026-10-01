import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { chat, streamChat, testConnection, AIError, isAbortError } from '../../src/lib/aiClient';
import { setAIStorage, type StorageLike } from '../../src/lib/aiConfig';

interface Seen { url: string; headers: http.IncomingHttpHeaders; body: any }

let server: http.Server;
let base = '';
let seen: Seen[] = [];
const openSockets = new Set<import('node:net').Socket>();

const delta = (s: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: s } }] })}\n\n`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function memStorage(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      let body: any = {};
      try { body = JSON.parse(raw || '{}'); } catch { /* ignore */ }
      seen.push({ url: req.url ?? '', headers: req.headers, body });
      const model: string = body.model ?? '';

      if (req.url !== '/v1/chat/completions' || req.method !== 'POST') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'no such route' } }));
      }
      if (model === 'unauthorized') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: 'Incorrect API key provided: sk-test-123456' } }));
      }
      if (model === 'forbidden') {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        return res.end('<html>blocked</html>');
      }
      if (model === 'ratelimited') {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' });
        return res.end(JSON.stringify({ error: { message: 'You exceeded your current quota' } }));
      }
      if (model === 'boom') {
        res.writeHead(500);
        return res.end('internal');
      }
      if (model === 'newmodel' && 'max_tokens' in body) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead." } }));
      }
      if (model === 'notemp' && 'temperature' in body) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: "Unsupported value: 'temperature' does not support 0.4 with this model." } }));
      }
      if (model === 'nojsonmode' && body.response_format) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: { message: "'response_format' of type 'json_object' is not supported" } }));
      }

      if (body.stream) {
        if (model === 'hang') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          res.write(delta('start'));
          return; // never ends; client must abort
        }
        if (model === 'cut') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          res.write(delta('par'));
          await sleep(20);
          return req.socket.destroy(); // abrupt disconnect
        }
        if (model === 'jsonstream') {
          // provider ignores stream:true
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ choices: [{ message: { content: 'plain json' } }] }));
        }
        if (model === 'streamerror') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          res.write(delta('a'));
          res.write(`data: ${JSON.stringify({ error: { message: 'overloaded' } })}\n\n`);
          return res.end();
        }
        // Default: SSE with awkward chunking: split mid-line, mid-JSON, and mid multibyte char, CRLF.
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
        const payload = Buffer.from(
          ': keepalive\r\n\r\n' + delta('Hello ').replace(/\n/g, '\r\n') + delta('世界 ') + delta('😀') + delta('!') + 'data: [DONE]\n\n',
        );
        const cuts = [7, 20, 33, 57, 61, 90, 110, 111, 112, 135];
        let prev = 0;
        for (const c of [...cuts, payload.length]) {
          if (c > payload.length) continue;
          res.write(payload.subarray(prev, c));
          prev = c;
          await sleep(3);
        }
        return res.end();
      }

      // Non-streaming
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (model === 'empty') return res.end(JSON.stringify({ choices: [{ message: { content: '' } }] }));
      res.end(JSON.stringify({ choices: [{ message: { content: `echo:${body.messages?.at(-1)?.content ?? ''}` } }] }));
    });
  });
  server.on('connection', (s) => { openSockets.add(s); s.on('close', () => openSockets.delete(s)); });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});

afterAll(async () => {
  for (const s of openSockets) s.destroy();
  await new Promise<void>((r) => server.close(() => r()));
});

beforeEach(() => { seen = []; setAIStorage(memStorage()); });
afterEach(() => setAIStorage(undefined));

const cfg = (model: string, extra: Record<string, string> = {}) => ({ baseUrl: base, apiKey: 'sk-test-123456', model, ...extra });
const msgs = [{ role: 'user' as const, content: 'hi' }];

describe('streamChat', () => {
  it('streams tokens with awkward chunking, CRLF, keepalives and multibyte splits', async () => {
    const tokens: string[] = [];
    const full = await streamChat({ messages: msgs, config: cfg('sse'), onToken: (t) => tokens.push(t) });
    expect(tokens).toEqual(['Hello ', '世界 ', '😀', '!']);
    expect(full).toBe('Hello 世界 😀!');
  });

  it('sends the key only to the configured endpoint, as a Bearer token, with sane params', async () => {
    await streamChat({ messages: msgs, config: cfg('sse'), maxTokens: 10_000_000 });
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('/v1/chat/completions');
    expect(seen[0].headers.authorization).toBe('Bearer sk-test-123456');
    expect(seen[0].body).toMatchObject({ model: 'sse', stream: true, messages: msgs });
    expect(seen[0].body.max_tokens).toBeLessThanOrEqual(8000);
  });

  it('omits Authorization when no key is configured (local endpoint)', async () => {
    await streamChat({ messages: msgs, config: { baseUrl: base, apiKey: '', model: 'sse' } });
    expect(seen[0].headers.authorization).toBeUndefined();
  });

  it('requires a key for non-local endpoints before making any request', async () => {
    await expect(
      streamChat({ messages: msgs, config: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'x' } }),
    ).rejects.toMatchObject({ kind: 'config' });
    expect(seen).toHaveLength(0);
  });

  it('caps the number of messages', async () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ role: 'user' as const, content: `m${i}` }));
    await streamChat({ messages: [{ role: 'system', content: 'sys' }, ...many], config: cfg('sse') });
    expect(seen[0].body.messages.length).toBeLessThanOrEqual(40);
    expect(seen[0].body.messages[0].role).toBe('system');
    expect(seen[0].body.messages.at(-1).content).toBe('m99');
  });

  it('maps 401 to a friendly error without leaking the key', async () => {
    const err = await streamChat({ messages: msgs, config: cfg('unauthorized') }).catch((e) => e);
    expect(err).toBeInstanceOf(AIError);
    expect(err.kind).toBe('auth');
    expect(err.status).toBe(401);
    expect(err.message).toMatch(/API key/i);
    expect(err.message).not.toContain('sk-test-123456');
  });

  it('maps 403, 429 and 5xx', async () => {
    expect(await streamChat({ messages: msgs, config: cfg('forbidden') }).catch((e) => e)).toMatchObject({ kind: 'forbidden', status: 403 });
    const rl = await streamChat({ messages: msgs, config: cfg('ratelimited') }).catch((e) => e);
    expect(rl).toMatchObject({ kind: 'rate_limit', status: 429 });
    expect(rl.message).toMatch(/rate limit|quota/i);
    expect(rl.message).toContain('exceeded your current quota');
    expect(await streamChat({ messages: msgs, config: cfg('boom') }).catch((e) => e)).toMatchObject({ kind: 'server', status: 500 });
  });

  it('maps 404 (wrong base URL) with a hint', async () => {
    const err = await streamChat({ messages: msgs, config: { baseUrl: base.replace('/v1', '/nope'), apiKey: 'k', model: 'x' } }).catch((e) => e);
    expect(err).toMatchObject({ kind: 'not_found', status: 404 });
    expect(err.message).toMatch(/base URL/i);
  });

  it('reports network failures mentioning CORS and the endpoint', async () => {
    const err = await streamChat({ messages: msgs, config: { baseUrl: 'http://127.0.0.1:1/v1', apiKey: 'k', model: 'x' } }).catch((e) => e);
    expect(err).toBeInstanceOf(AIError);
    expect(err.kind).toBe('network');
    expect(err.message).toMatch(/CORS/);
    expect(err.message).toMatch(/127\.0\.0\.1:1/);
  });

  it('can be aborted mid-stream', async () => {
    const ctrl = new AbortController();
    const tokens: string[] = [];
    const p = streamChat({
      messages: msgs, config: cfg('hang'), signal: ctrl.signal,
      onToken: (t) => { tokens.push(t); ctrl.abort(); },
    });
    const err = await p.catch((e) => e);
    expect(isAbortError(err)).toBe(true);
    expect(tokens).toEqual(['start']);
  });

  it('rejects immediately with an AbortError when the signal is already aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const err = await streamChat({ messages: msgs, config: cfg('sse'), signal: ctrl.signal }).catch((e) => e);
    expect(isAbortError(err)).toBe(true);
  });

  it('reports a dropped connection as a network error', async () => {
    const err = await streamChat({ messages: msgs, config: cfg('cut') }).catch((e) => e);
    expect(err).toBeInstanceOf(AIError);
    expect(err.kind).toBe('network');
  });

  it('surfaces in-stream provider errors', async () => {
    const err = await streamChat({ messages: msgs, config: cfg('streamerror') }).catch((e) => e);
    expect(err).toBeInstanceOf(AIError);
    expect(err.message).toContain('overloaded');
  });

  it('falls back when the provider ignores stream:true and returns JSON', async () => {
    const tokens: string[] = [];
    const full = await streamChat({ messages: msgs, config: cfg('jsonstream'), onToken: (t) => tokens.push(t) });
    expect(full).toBe('plain json');
    expect(tokens).toEqual(['plain json']);
  });

  it('retries with max_completion_tokens / without temperature when the model demands it', async () => {
    expect(await streamChat({ messages: msgs, config: cfg('newmodel') })).toBe('Hello 世界 😀!');
    const last = seen.at(-1)!.body;
    expect(last.max_tokens).toBeUndefined();
    expect(last.max_completion_tokens).toBeGreaterThan(0);

    seen = [];
    expect(await streamChat({ messages: msgs, config: cfg('notemp') })).toBe('Hello 世界 😀!');
    expect(seen.at(-1)!.body.temperature).toBeUndefined();
  });
});

describe('chat (non-streaming)', () => {
  it('returns the assistant text', async () => {
    expect(await chat({ messages: msgs, config: cfg('plain') })).toBe('echo:hi');
    expect(seen[0].body.stream).toBe(false);
    expect(seen[0].headers.authorization).toBe('Bearer sk-test-123456');
  });

  it('drops response_format when the provider rejects JSON mode', async () => {
    expect(await chat({ messages: msgs, config: cfg('nojsonmode'), jsonMode: true })).toBe('echo:hi');
    expect(seen).toHaveLength(2);
    expect(seen[0].body.response_format).toEqual({ type: 'json_object' });
    expect(seen[1].body.response_format).toBeUndefined();
  });

  it('maps 401 and 429', async () => {
    expect(await chat({ messages: msgs, config: cfg('unauthorized') }).catch((e) => e)).toMatchObject({ kind: 'auth' });
    expect(await chat({ messages: msgs, config: cfg('ratelimited') }).catch((e) => e)).toMatchObject({ kind: 'rate_limit' });
  });

  it('errors on an empty completion', async () => {
    expect(await chat({ messages: msgs, config: cfg('empty') }).catch((e) => e)).toMatchObject({ kind: 'empty' });
  });

  it('honours AbortSignal', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const err = await chat({ messages: msgs, config: cfg('plain'), signal: ctrl.signal }).catch((e) => e);
    expect(isAbortError(err)).toBe(true);
    expect(seen).toHaveLength(0);
  });

  it('uses the stored config when no override is given', async () => {
    const { saveAIConfig } = await import('../../src/lib/aiConfig');
    saveAIConfig({ baseUrl: base, apiKey: 'sk-stored-999999', model: 'plain' });
    await chat({ messages: msgs });
    expect(seen[0].headers.authorization).toBe('Bearer sk-stored-999999');
    expect(seen[0].body.model).toBe('plain');
  });
});

describe('testConnection', () => {
  it('reports success', async () => {
    const r = await testConnection(cfg('plain'));
    expect(r.ok).toBe(true);
  });
  it('reports failure with a friendly message and never throws', async () => {
    const r = await testConnection(cfg('unauthorized'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/API key/i);
  });
});
