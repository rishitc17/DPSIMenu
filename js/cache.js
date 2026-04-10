/**
 * Cache — reduces Supabase reads by caching results in memory.
 * Falls back to fetching if cache is expired or missing.
 * TTL is configurable via CONFIG.CACHE_TTL_MS.
 */

const Cache = {
  store: new Map(),

  set(key, value) {
    this.store.set(key, { value, ts: Date.now() });
  },

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CONFIG.CACHE_TTL_MS) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  },

  invalidate(key) {
    this.store.delete(key);
  },

  invalidatePrefix(prefix) {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  },

  clear() {
    this.store.clear();
  },

  /**
   * Fetch helper: returns cached result or calls fetcher and caches it.
   */
  async fetch(key, fetcher) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    const result = await fetcher();
    this.set(key, result);
    return result;
  },
};
