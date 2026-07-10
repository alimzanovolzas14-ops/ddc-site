// Live news proxy: scrapes the public Telegram preview of the configured channel.
// Contract: ALWAYS HTTP 200 JSON. {ok:true, posts:[{link,date,text,photo}]} or {ok:false, posts:[]}.
// The site's rail stays hidden unless ok && posts.length — this function can never break the page.
// Channel + on/off come from the integrations settings (Blobs); defaults keep today's behavior.
import { getSettings, writeHealth, RE } from './lib/store.mjs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
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
    const r = await fetch('https://t.me/s/' + channel, {
      headers: { 'user-agent': UA, 'accept-language': 'ru,en;q=0.8' },
    });
    if (!r.ok) throw new Error('upstream ' + r.status);
    const html = await r.text();
    const posts = [];
    for (const b of html.split('tgme_widget_message_wrap').slice(1)) {
      const link = (b.match(/data-post="([^"]+)"/) || [])[1];
      const date = (b.match(/datetime="([^"]+)"/) || [])[1] || '';
      const tm = b.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
      let text = '';
      if (tm) {
        text = tm[1]
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ').trim();
      }
      const photo = (b.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/) || [])[1] || '';
      if (link && (text || photo)) posts.push({ link: 'https://t.me/' + link, date, text: text.slice(0, 280), photo });
    }
    posts.reverse();
    await writeHealth('news', posts.length > 0, posts.length, '');
    return new Response(JSON.stringify({ ok: posts.length > 0, posts: posts.slice(0, 10) }), { headers: HEADERS });
  } catch (e) {
    await writeHealth('news', false, 0, (e && e.message) || e);
    return new Response(JSON.stringify({ ok: false, posts: [], err: String((e && e.message) || e) }), { status: 200, headers: HEADERS });
  }
};

export const config = { path: '/api/news' };
