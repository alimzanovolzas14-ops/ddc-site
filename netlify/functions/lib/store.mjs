// Shared helpers for the integrations backend.
// Design rule inherited from news.mjs: nothing here may ever break a public page —
// every Blobs access is try/catch'd and falls back to safe defaults.
import { createHash, timingSafeEqual } from 'node:crypto';

export const DEFAULTS = {
  banner: { on: false, text: '', type: 'info' },
  tg:     { on: true,  channel: 'nationalbankofkazakhstan' },
  tgJobs: { on: false, channel: 'TALENT_BSBNB' },
  hh:     { on: false, employerId: '' },
  insta:  { on: false, feedUrl: '' },
  updatedAt: '',
};

export const RE = {
  channel:    /^[A-Za-z0-9_]{3,64}$/,
  employerId: /^\d{1,12}$/,
};

async function store(consistency) {
  const { getStore } = await import('@netlify/blobs');
  return getStore(consistency ? { name: 'ddc', consistency } : { name: 'ddc' });
}

function merge(base, patch) {
  const out = { ...base };
  for (const k of Object.keys(patch || {})) {
    const v = patch[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') {
      out[k] = merge(base[k], v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

export { merge };

export async function getSettings() {
  try {
    const s = await store('strong');
    const raw = await s.get('settings.json', { type: 'json' });
    return merge(DEFAULTS, raw || {});
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(patch) {
  const s = await store('strong');
  const cur = await getSettings();
  const next = merge(cur, patch);
  next.updatedAt = new Date().toISOString();
  await s.setJSON('settings.json', next);
  return next;
}

export async function readJSON(key) {
  try {
    const s = await store();
    return await s.get(key, { type: 'json' });
  } catch {
    return null;
  }
}

export async function writeJSON(key, value) {
  try {
    const s = await store();
    await s.setJSON(key, value);
  } catch { /* best effort */ }
}

export async function deleteKey(key) {
  try {
    const s = await store();
    await s.delete(key);
  } catch { /* best effort */ }
}

export async function writeHealth(feed, ok, count, err) {
  await writeJSON('health/' + feed + '.json', {
    lastFetch: new Date().toISOString(),
    ok: !!ok,
    count: count | 0,
    err: err ? String(err).slice(0, 300) : '',
  });
}

export function isAdmin(req) {
  const t = process.env.ADMIN_TOKEN;
  const got = req.headers.get('x-admin-token') || '';
  if (!t || !got) return false; // unset env var -> always false (fail closed)
  // constant-time compare; hashing first removes any length oracle
  const a = createHash('sha256').update(got).digest();
  const b = createHash('sha256').update(t).digest();
  return timingSafeEqual(a, b);
}

export function json(body, cache) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache || 'no-store',
    },
  });
}
