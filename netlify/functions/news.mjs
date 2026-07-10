// Live news proxy: scrapes the public Telegram preview of the configured channel.
// Contract: ALWAYS HTTP 200 JSON. {ok:true, posts:[{link,date,text,photo}]} or {ok:false, posts:[]}.
// The site's rail stays hidden unless ok && posts.length — this function can never break the page.
// Channel + on/off come from the integrations settings (Blobs); defaults keep today's behavior.
import { getSettings, writeHealth, RE } from './lib/store.mjs';
import { fetchChannelPosts } from './lib/tg.mjs';

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, s-maxage=600, stale-while-revalidate=3600',
};

export default async () => {
  try {
    const cfg = await getSettings();
    if (!cfg.tg.on) return new Response(JSON.stringify({ ok: false, posts: [], off: true }), { headers: HEADERS });
    // re-validate before URL interpolation — second line of defense against stored SSRF
    const channel = RE.channel.test(cfg.tg.channel) ? cfg.tg.channel : 'nationalbankofkazakhstan';
    const posts = await fetchChannelPosts(channel);
    await writeHealth('news', posts.length > 0, posts.length, '');
    return new Response(JSON.stringify({ ok: posts.length > 0, posts: posts.slice(0, 10) }), { headers: HEADERS });
  } catch (e) {
    await writeHealth('news', false, 0, (e && e.message) || e);
    return new Response(JSON.stringify({ ok: false, posts: [], err: String((e && e.message) || e) }), { status: 200, headers: HEADERS });
  }
};

export const config = { path: '/api/news' };
