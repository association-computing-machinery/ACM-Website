export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const REQUEST_TIMEOUT_MS = 20000;

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const isBodylessRead = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  const headers = {
    ...(!isBodylessRead ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };

  // A hung request must not leave every submit button latched on "busy" forever.
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(`/api${path}`, {
        ...options,
        credentials: 'same-origin',
        headers,
        signal: options.signal ?? controller.signal,
      });
    } catch (cause) {
      // Keep the real cause in the console rather than reporting a CSP failure,
      // mixed content block or abort as "check your connection".
      console.error(`API request to ${path} failed:`, cause);
      const aborted = cause instanceof DOMException && cause.name === 'AbortError';
      throw new ApiError(0, aborted
        ? 'The request took too long. Check your connection and try again.'
        : 'Unable to connect. Check your connection and try again.');
    }

    if (response.status === 204) return undefined as T;

    const result = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(response.status, result?.error || `HTTP ${response.status}`);
    if (result === null) throw new ApiError(response.status, 'Unexpected response from the server.');
    return result as T;
  } finally {
    window.clearTimeout(timer);
  }
}

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
