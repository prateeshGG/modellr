import { useEffect, useState } from 'react';
import { fetchStarCount } from '../lib/githubStars';

/** Star count for the project repo; null until known (or when unavailable). */
export function useGithubStars(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    fetchStarCount(ctrl.signal).then((n) => { if (!ctrl.signal.aborted) setCount(n); });
    return () => ctrl.abort();
  }, []);
  return count;
}
