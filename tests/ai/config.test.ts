import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAIConfig, saveAIConfig, clearAIConfig, isAIConfigured, setAIStorage, normalizeBaseUrl,
  isLocalEndpoint, validateAIConfig, DEFAULT_BASE_URL, DEFAULT_MODEL, AI_CONFIG_STORAGE_KEY, type StorageLike,
} from '../../src/lib/aiConfig';

function memStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

afterEach(() => setAIStorage(undefined));

describe('aiConfig', () => {
  let storage: ReturnType<typeof memStorage>;
  beforeEach(() => { storage = memStorage(); setAIStorage(storage); });

  it('returns defaults and is not configured by default', () => {
    expect(getAIConfig()).toEqual({ baseUrl: DEFAULT_BASE_URL, apiKey: '', model: DEFAULT_MODEL });
    expect(isAIConfigured()).toBe(false);
  });

  it('saves, normalises and reloads', () => {
    saveAIConfig({ baseUrl: ' https://openrouter.ai/api/v1/chat/completions/ ', apiKey: '  sk-abc ', model: 'm1' });
    expect(JSON.parse(storage.data.get(AI_CONFIG_STORAGE_KEY)!)).toEqual({ baseUrl: 'https://openrouter.ai/api/v1', apiKey: 'sk-abc', model: 'm1' });
    expect(getAIConfig().apiKey).toBe('sk-abc');
    expect(isAIConfigured()).toBe(true);
  });

  it('does not require a key for local endpoints', () => {
    saveAIConfig({ baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' });
    expect(isAIConfigured()).toBe(true);
    expect(isLocalEndpoint('http://127.0.0.1:8080/v1')).toBe(true);
    expect(isLocalEndpoint('https://api.openai.com/v1')).toBe(false);
  });

  it('validates URLs and models', () => {
    expect(validateAIConfig({ baseUrl: 'ftp://x', apiKey: 'k', model: 'm' })).toMatch(/http/);
    expect(validateAIConfig({ baseUrl: 'nope', apiKey: 'k', model: 'm' })).toMatch(/valid URL/);
    expect(validateAIConfig({ baseUrl: 'https://a.b/v1', apiKey: 'k', model: '' })).toMatch(/model/i);
    expect(normalizeBaseUrl('')).toBe(DEFAULT_BASE_URL);
  });

  it('survives corrupt stored data', () => {
    storage.data.set(AI_CONFIG_STORAGE_KEY, '{not json');
    expect(getAIConfig().baseUrl).toBe(DEFAULT_BASE_URL);
  });

  it('clearAIConfig resets', () => {
    saveAIConfig({ apiKey: 'sk-x' });
    clearAIConfig();
    expect(getAIConfig().apiKey).toBe('');
  });

  it('works with no storage at all (falls back to memory)', () => {
    setAIStorage(null);
    expect(getAIConfig().apiKey).toBe('');
    saveAIConfig({ apiKey: 'sk-mem', model: 'x' });
    expect(getAIConfig()).toMatchObject({ apiKey: 'sk-mem', model: 'x' });
  });

  it('works when storage throws', () => {
    setAIStorage({
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); },
    });
    expect(() => getAIConfig()).not.toThrow();
    expect(() => saveAIConfig({ apiKey: 'sk-throw' })).not.toThrow();
    expect(getAIConfig().apiKey).toBe('sk-throw');
  });

  it('works when localStorage global is missing (node)', () => {
    setAIStorage(undefined);
    expect(() => getAIConfig()).not.toThrow();
  });
});
