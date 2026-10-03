/** Centralized HTTP client for the Worko mobile app. */

// Development default for a physical Android device connected with:
// adb reverse tcp:3000 tcp:3000
export const API_BASE_URL = 'http://127.0.0.1:3000/api/v1';

export function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${API_BASE_URL}${normalizedPath}`, init);
}
