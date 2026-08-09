export class KrabbxApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async request<T = unknown>(
    method: string,
    path: string,
    options?: { query?: Record<string, string | number | boolean | undefined>; body?: unknown },
  ): Promise<T> {
    const url = new URL(path, this.baseUrl.replace(/\/$/, '') + '/');
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
    let body: string | undefined;
    if (options?.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const res = await fetch(url, { method, headers, body });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Krabbx API ${method} ${path} failed (${res.status}): ${text || res.statusText}`);
    }
    if (!text || res.status === 204) {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}
