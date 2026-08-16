const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem('spendwise_access_token'),
    refreshToken: localStorage.getItem('spendwise_refresh_token'),
  };
}

export function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('spendwise_access_token', accessToken);
  localStorage.setItem('spendwise_refresh_token', refreshToken);
}

export function clearStoredTokens() {
  localStorage.removeItem('spendwise_access_token');
  localStorage.removeItem('spendwise_refresh_token');
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  data: any;

  constructor(status: number, statusText: string, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken } = getStoredTokens();

  const headers = new Headers(options.headers || {});
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized -> try refresh token (except for auth endpoints)
  if (
    response.status === 401 &&
    !endpoint.startsWith('/auth/') &&
    getStoredTokens().refreshToken
  ) {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: getStoredTokens().refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setStoredTokens(refreshData.access_token, getStoredTokens().refreshToken || '');
        headers.set('Authorization', `Bearer ${refreshData.access_token}`);
        // Retry request
        response = await fetch(`${BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      } else {
        clearStoredTokens();
        throw new ApiError(401, 'Unauthorized', 'Session expired. Please log in again.');
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      clearStoredTokens();
      throw new ApiError(401, 'Unauthorized', 'Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    let errorDetail = 'API request failed';
    let errJson: any = null;
    try {
      errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = response.statusText;
    }
    throw new ApiError(response.status, response.statusText, errorDetail, errJson);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
