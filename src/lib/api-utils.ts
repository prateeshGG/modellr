import { useAuthStore } from '../store/authStore';

/**
 * Returns the backend base URL (VITE_API_URL or relative path)
 */
export function getBackendBase(): string {
  return (import.meta as any).env?.VITE_API_URL ?? '';
}

/**
 * Authenticated fetch helper that includes the Supabase session token.
 */
export async function authFetch(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().session?.access_token;
  const baseUrl = getBackendBase();
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Optional: trigger logout or refresh if token expired
  }

  return response;
}
