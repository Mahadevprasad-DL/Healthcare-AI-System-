const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:4000/api';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = localStorage.getItem('healthsetu_auth_token');
  const { skipAuth = false, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    const fallbackMessage = `Request failed (${response.status} ${response.statusText})`;
    throw new Error((payload as { message?: string }).message || fallbackMessage);
  }

  return payload;
}
