// Career channel proxy: scrapes the public Telegram preview of the configured
// jobs channel (default TALENT_BSBNB). Same contract as news.mjs:
// ALWAYS HTTP 200 JSON — {ok:true, posts:[{link,date,text,photo}]} or {ok:false, posts:[]}.
// The careers rail stays hidden unless ok && posts.length.
import { getSettings, writeHealth, RE } from './lib/store.mjs';
import { fetchChannelPosts } from './lib/tg.mjs';

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, s-maxage=1800, stale-while-revalidate=3600',
};

export default async () => {
  try {
    const cfg = await getSettings();
    if (!cfg.tgJobs.on) return new Response(JSON.stringify({ ok: false, posts: [], off: true }), { headers: HEADERS });
    // re-validate before URL interpolation — second line of defense against stored SSRF
    const channel = RE.channel.test(cfg.tgJobs.channel) ? cfg.tgJobs.channel : 'TALENT_BSBNB';
    const posts = await fetchChannelPosts(channel);
    await writeHealth('talent', posts.length > 0, posts.length, '');
    return new Response(JSON.stringify({ ok: posts.length > 0, channel, posts: posts.slice(0, 10) }), { headers: HEADERS });
  } catch (e) {
    await writeHealth('talent', false, 0, (e && e.message) || e);
    return new Response(JSON.stringify({ ok: false, posts: [], err: String((e && e.message) || e) }), { status: 200, headers: HEADERS });
  }
};

export const config = { path: '/api/talent' };
