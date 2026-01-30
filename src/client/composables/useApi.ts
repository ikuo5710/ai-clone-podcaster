export function useApi() {
  async function get<T>(path: string): Promise<T> {
    const res = await fetch(path);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? `API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async function post(path: string, body: FormData): Promise<Response> {
    const res = await fetch(path, { method: 'POST', body });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: string }).error ?? `API error: ${res.status}`);
    }
    return res;
  }

  async function del(path: string): Promise<void> {
    const res = await fetch(path, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { error?: string }).error ?? `API error: ${res.status}`);
    }
  }

  return { get, post, del };
}
