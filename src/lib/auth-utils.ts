import { useAuthStore } from '../store/authStore';

/**
 * Returns the Authorization header with the current session's JWT token
 */
export function getAuthHeader(): Record<string, string> {
  const session = useAuthStore.getState().session;
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}
