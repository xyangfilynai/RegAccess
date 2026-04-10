/**
 * API client for ChangePath Enterprise backend.
 *
 * In development, requests are proxied by Vite to localhost:3001.
 * The x-user-id header is injected for dev auth.
 */

const DEV_USER_ID = '00000000-0000-4000-a000-000000000010'; // Alice Admin

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-user-id': localStorage.getItem('changepath-dev-user-id') ?? DEV_USER_ID,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(path, { headers: getHeaders() });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(path, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(path, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(path, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(response);
  },
};

/** Switch dev user (for testing multi-user scenarios) */
export function setDevUserId(userId: string) {
  localStorage.setItem('changepath-dev-user-id', userId);
}
