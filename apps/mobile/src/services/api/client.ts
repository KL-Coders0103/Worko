/** Centralized HTTP client for all Worko API requests. */
declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_BASE_URL = (configuredBaseUrl || 'http://127.0.0.1:3000/api/v1').replace(/\/+$/, '');

export function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return fetch(`${API_BASE_URL}${normalizedPath}`, init);
}
