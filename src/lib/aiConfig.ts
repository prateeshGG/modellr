/**
 * Bring-your-own-key AI configuration.
 *
 * The config lives ONLY in this browser's localStorage and is only ever sent to
 * the configured `baseUrl`. All storage access is wrapped in try/catch so the app
 * keeps working when storage is blocked (private mode, SSR, tests).
 */
import { useMemo } from 'react';
import { create } from 'zustand';

export interface AIConfig {
  /** OpenAI-compatible base URL, e.g. https://api.openai.com/v1 (no trailing slash). */
  baseUrl: string;
  /** Optional for local endpoints such as Ollama. */
  apiKey: string;
  model: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface AIPreset {
  id: 'openai' | 'openrouter' | 'ollama' | 'custom';
  label: string;
  baseUrl: string;
  model: string;
  needsKey: boolean;
  hint: string;
}

export const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_MODEL = 'gpt-4o-mini';
export const AI_CONFIG_STORAGE_KEY = 'modellr.ai.config.v1';

export const AI_PRESETS: AIPreset[] = [
  { id: 'openai', label: 'OpenAI', baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, needsKey: true, hint: 'Get a key at platform.openai.com/api-keys' },
  { id: 'openrouter', label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', needsKey: true, hint: 'Get a key at openrouter.ai/keys. Many models, browser-friendly CORS.' },
  { id: 'ollama', label: 'Ollama (local)', baseUrl: 'http://localhost:11434/v1', model: 'llama3.1', needsKey: false, hint: 'No key needed. Start Ollama with OLLAMA_ORIGINS set to this site so the browser may call it.' },
  { id: 'custom', label: 'Custom', baseUrl: '', model: '', needsKey: false, hint: 'Any OpenAI-compatible /chat/completions endpoint.' },
];

export function presetForBaseUrl(baseUrl: string): AIPreset {
  const n = normalizeBaseUrl(baseUrl);
  return AI_PRESETS.find((p) => p.id !== 'custom' && p.baseUrl === n) ?? AI_PRESETS[AI_PRESETS.length - 1];
}

/** Trim, drop trailing slashes and a pasted `/chat/completions` suffix. Empty input -> default. */
export function normalizeBaseUrl(url: string | undefined | null): string {
  let u = (url ?? '').trim();
  if (!u) return DEFAULT_BASE_URL;
  u = u.replace(/\/+$/, '').replace(/\/chat\/completions$/i, '').replace(/\/+$/, '');
  return u;
}

export function isLocalEndpoint(baseUrl: string): boolean {
  try {
    const h = new URL(normalizeBaseUrl(baseUrl)).hostname.toLowerCase();
    return h === 'localhost' || h === '::1' || h === '[::1]' || h === '0.0.0.0' || /^127\.\d+\.\d+\.\d+$/.test(h) || h.endsWith('.localhost');
  } catch {
    return false;
  }
}

/** Returns an error message when the config cannot be used, else null. */
export function validateAIConfig(config: AIConfig): string | null {
  let url: URL;
  try {
    url = new URL(config.baseUrl);
  } catch {
    return 'The base URL is not a valid URL (example: https://api.openai.com/v1).';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'The base URL must start with http:// or https://.';
  if (!config.model.trim()) return 'Enter a model name.';
  if (!config.apiKey.trim() && !isLocalEndpoint(config.baseUrl)) return 'An API key is required for this endpoint.';
  return null;
}

function sanitize(raw: Partial<AIConfig> | null | undefined): AIConfig {
  return {
    baseUrl: normalizeBaseUrl(typeof raw?.baseUrl === 'string' ? raw.baseUrl : ''),
    apiKey: typeof raw?.apiKey === 'string' ? raw.apiKey.trim() : '',
    model: (typeof raw?.model === 'string' && raw.model.trim()) || DEFAULT_MODEL,
  };
}

// ── storage plumbing ────────────────────────────────────────────────────────
let storageOverride: StorageLike | null | undefined; // undefined = use localStorage
let memoryConfig: AIConfig | null = null; // only used when storage is unusable
let memoryFallbackActive = false;

/** Inject a storage (tests). Pass `undefined` to go back to localStorage, `null` for "no storage". */
export function setAIStorage(storage: StorageLike | null | undefined): void {
  storageOverride = storage;
  memoryConfig = null;
  memoryFallbackActive = false;
}

function getStorage(): StorageLike | null {
  if (storageOverride !== undefined) return storageOverride;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function getAIConfig(): AIConfig {
  if (memoryFallbackActive && memoryConfig) return { ...memoryConfig };
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(AI_CONFIG_STORAGE_KEY);
      if (raw) return sanitize(JSON.parse(raw));
      return sanitize(null);
    } catch {
      /* fall through to memory */
    }
  }
  return memoryConfig ? { ...memoryConfig } : sanitize(null);
}

/** Saves (normalized) config. Never throws; falls back to in-memory if storage is blocked. */
export function saveAIConfig(config: Partial<AIConfig>): AIConfig {
  const clean = sanitize({ ...getAIConfig(), ...config });
  memoryConfig = clean;
  memoryFallbackActive = false;
  const storage = getStorage();
  try {
    if (!storage) throw new Error('no storage');
    storage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    memoryFallbackActive = true;
  }
  useAIDialogStore.getState().bump();
  return clean;
}

export function clearAIConfig(): void {
  memoryConfig = null;
  memoryFallbackActive = false;
  try {
    const s = getStorage();
    if (s?.removeItem) s.removeItem(AI_CONFIG_STORAGE_KEY);
    else s?.setItem(AI_CONFIG_STORAGE_KEY, '');
  } catch {
    /* ignore */
  }
  useAIDialogStore.getState().bump();
}

export function isAIConfigured(config: AIConfig = getAIConfig()): boolean {
  return validateAIConfig(config) === null;
}

// ── UI store: lets TopBar / Settings / CommandPalette open the dialog ───────
interface AIDialogState {
  isOpen: boolean;
  /** Incremented whenever the saved config changes so UIs can re-evaluate isAIConfigured(). */
  configVersion: number;
  open: () => void;
  close: () => void;
  bump: () => void;
}

export const useAIDialogStore = create<AIDialogState>((set) => ({
  isOpen: false,
  configVersion: 0,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  bump: () => set((s) => ({ configVersion: s.configVersion + 1 })),
}));

/** Convenience for non-React callers. */
export function openAISettings(): void {
  useAIDialogStore.getState().open();
}

/** React hook: true when AI is usable; re-renders when the config is saved/cleared. */
export function useAIConfigured(): boolean {
  const version = useAIDialogStore((s) => s.configVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => isAIConfigured(), [version]);
}
