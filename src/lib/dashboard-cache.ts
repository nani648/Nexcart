// Persistent localStorage cache for dashboard — survives browser refresh + new tabs.
// Falls back to in-memory Map on environments without localStorage (SSR).

const MEM = new Map<string, { data: unknown; expiresAt: number }>();

function read(key: string): { data: unknown; expiresAt: number } | null {
  try {
    const raw = localStorage.getItem(`nxc-dc:${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return MEM.get(key) ?? null;
  }
}

function write(key: string, entry: { data: unknown; expiresAt: number }) {
  try {
    localStorage.setItem(`nxc-dc:${key}`, JSON.stringify(entry));
  } catch {
    MEM.set(key, entry);
  }
}

function remove(key: string) {
  try { localStorage.removeItem(`nxc-dc:${key}`); } catch {}
  MEM.delete(key);
}

export function cacheGet<T>(key: string): T | null {
  const entry = read(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { remove(key); return null; }
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs = 60_000) {
  write(key, { data, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key: string) { remove(key); }
export function cacheClear() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith("nxc-dc:"))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
  MEM.clear();
}

export async function cachedFetch<T>(
  url: string,
  options: RequestInit,
  ttlMs = 60_000
): Promise<T> {
  const cached = cacheGet<T>(url);
  if (cached !== null) return cached;
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status}`);
  const data: T = await res.json();
  cacheSet(url, data, ttlMs);
  return data;
}
