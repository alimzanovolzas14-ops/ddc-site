// Instagram feed relay. Direct scraping is impossible from datacenter IPs, so this only
// proxies a pre-configured JSON feed URL (e.g. a Behold feed or a Graph API endpoint with
// a long-lived token) stored in the integrations settings. Ships disabled by default.
// Contract: ALWAYS HTTP 200 JSON, {ok, posts:[...]}.
import { getSettings, readJSON, writeJSON, writeHealth, json } from './lib/store.mjs';

const TTL = 600000;
const CACHE = 'public, s-maxage=600, stale-while-revalidate=3600';

export default async () => {
  try {
    const cfg = await getSettings();
    if (!cfg.insta.on || !/^https:\/\//.test(cfg.insta.feedUrl)) {
      return json({ ok: false, posts: [], off: true }, CACHE);
    }

    const cached = await readJSON('cache/instagram.json');
    if (cached && Date.now() - cached.t < TTL && Array.isArray(cached.posts)) {
      return json({ ok: cached.posts.length > 0, posts: cached.posts }, CACHE);
    }

    const r = await fetch(cfg.insta.feedUrl, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error('feed ' + r.status);
    const data = await r.json();
    // Accept both Behold ({posts:[...]}) and Graph API ({data:[...]}) shapes.
    const raw = Array.isArray(data.posts) ? data.posts : Array.isArray(data.data) ? data.data : [];
    const posts = raw.slice(0, 12).map((p) => ({
      link: p.permalink || p.link || '',
      img: p.mediaUrl || p.media_url || p.thumbnailUrl || p.thumbnail_url || '',
      caption: String(p.caption || p.prunedCaption || '').slice(0, 280),
      date: p.timestamp || p.date || '',
    })).filter((p) => p.link && p.img);

    await writeJSON('cache/instagram.json', { t: Date.now(), posts });
    await writeHealth('instagram', true, posts.length, '');
    return json({ ok: posts.length > 0, posts }, CACHE);
  } catch (e) {
    await writeHealth('instagram', false, 0, (e && e.message) || e);
    return json({ ok: false, posts: [], err: String((e && e.message) || e) }, CACHE);
  }
};

export const config = { path: '/api/instagram' };
