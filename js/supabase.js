/**
 * Supabase client — lightweight REST wrapper (no SDK)
 * Uses the Supabase REST API directly to avoid loading a large library.
 */

const DB = {
  url: null,
  key: null,

  init() {
    this.url = CONFIG.SUPABASE_URL.replace(/\/$/, '');
    this.key = CONFIG.SUPABASE_ANON_KEY;
  },

  headers(extra = {}) {
    return {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...extra,
    };
  },

  async request(method, path, body = null, params = {}) {
    const url = new URL(`${this.url}/rest/v1/${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const opts = { method, headers: this.headers() };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url.toString(), opts);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  // SELECT
  async select(table, query = '*', filters = {}, single = false) {
    const params = { select: query };
    Object.entries(filters).forEach(([k, v]) => { params[k] = v; });
    const extra = single ? { 'Accept': 'application/vnd.pgrst.object+json' } : {};
    const url = new URL(`${this.url}/rest/v1/${table}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), { headers: { ...this.headers(), ...extra } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : (single ? null : []);
  },

  // INSERT
  async insert(table, data) {
    return this.request('POST', table, data);
  },

  // UPDATE
  async update(table, data, filterKey, filterVal) {
    const params = { [filterKey]: `eq.${filterVal}` };
    const url = new URL(`${this.url}/rest/v1/${table}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  // UPSERT
  async upsert(table, data, onConflict) {
    const headers = { ...this.headers(), 'Prefer': `resolution=merge-duplicates,return=representation` };
    const url = new URL(`${this.url}/rest/v1/${table}`);
    if (onConflict) url.searchParams.set('on_conflict', onConflict);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  // DELETE
  async delete(table, filterKey, filterVal) {
    const url = new URL(`${this.url}/rest/v1/${table}`);
    url.searchParams.set(filterKey, `eq.${filterVal}`);
    const res = await fetch(url.toString(), {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return true;
  },

  // RPC (call a database function)
  async rpc(fn, params = {}) {
    const res = await fetch(`${this.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },
};

// Initialise immediately
DB.init();
