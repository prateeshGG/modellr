/**
 * GitHub star count for the site header.
 *
 * This is the only network request the public pages make besides fonts: a plain GET to
 * api.github.com (no token, no cookies). The result is cached in localStorage so a visitor makes
 * at most one request every few hours, which also keeps us far below GitHub's unauthenticated
 * rate limit. Any failure (offline, rate limited, repo renamed or private) just hides the number.
 */
import { GITHUB_REPO } from '../config';

const CACHE_KEY = 'modellr.stars.v1';
const TTL_MS = 6 * 60 * 60 * 1000;

interface Cached { repo: string; count: number; at: number }

export function formatStars(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1000) return String(Math.round(n));
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cached;
    return c && c.repo === GITHUB_REPO && typeof c.count === 'number' && typeof c.at === 'number' ? c : null;
  } catch {
    return null;
  }
}

function writeCache(count: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ repo: GITHUB_REPO, count, at: Date.now() } satisfies Cached));
  } catch { /* storage blocked: fine */ }
}

/** Returns the star count, or null when it can't be determined. */
export async function fetchStarCount(signal?: AbortSignal): Promise<number | null> {
  const cached = readCache();
  if (cached && Date.now() - cached.at < TTL_MS) return cached.count;
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal,
    });
    if (!res.ok) return cached?.count ?? null;
    const data = (await res.json()) as { stargazers_count?: unknown };
    if (typeof data.stargazers_count !== 'number') return cached?.count ?? null;
    writeCache(data.stargazers_count);
    return data.stargazers_count;
  } catch {
    return cached?.count ?? null;
  }
}
