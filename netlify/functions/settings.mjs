// Integrations settings API. ALWAYS HTTP 200 JSON (same contract as news.mjs).
// GET               -> {ok, public:{banner}}            (what public pages need, nothing more)
// GET  + admin hdr  -> {ok, admin:true, settings, health}
// POST + admin hdr  -> merge+validate partial settings, or {action:'purge', feed}
// Auth: x-admin-token header compared to the ADMIN_TOKEN env var server-side.
import { getSettings, saveSettings, readJSON, deleteKey, isAdmin, json, RE } from './lib/store.mjs';

export default async (req) => {
  try {
    if (req.method === 'GET') {
      const s = await getSettings();
      if (!isAdmin(req)) return json({ ok: true, public: { banner: s.banner } });
      const [news, vacancies, instagram, talent] = await Promise.all([
        readJSON('health/news.json'), readJSON('health/vacancies.json'), readJSON('health/instagram.json'), readJSON('health/talent.json'),
      ]);
      return json({ ok: true, admin: true, settings: s, health: { news, vacancies, instagram, talent } });
    }

    if (req.method === 'POST') {
      if (!isAdmin(req)) return json({ ok: false, err: 'unauthorized' });
      const body = await req.json().catch(() => ({}));

      if (body.action === 'purge') {
        const feed = String(body.feed || '');
        if (!['news', 'vacancies', 'instagram', 'talent'].includes(feed)) return json({ ok: false, err: 'bad feed' });
        await deleteKey('cache/' + feed + '.json');
        await deleteKey('health/' + feed + '.json');
        return json({ ok: true, purged: feed });
      }

      const patch = {};
      if (body.banner) {
        patch.banner = {
          on: !!body.banner.on,
          text: String(body.banner.text || '').slice(0, 300),
          type: ['info', 'warn', 'alert'].includes(body.banner.type) ? body.banner.type : 'info',
        };
      }
      if (body.tg) {
        const ch = String(body.tg.channel || '').trim();
        if (ch && !RE.channel.test(ch)) return json({ ok: false, err: 'bad channel' });
        patch.tg = { on: !!body.tg.on, ...(ch ? { channel: ch } : {}) };
      }
      if (body.tgJobs) {
        const ch = String(body.tgJobs.channel || '').trim();
        if (ch && !RE.channel.test(ch)) return json({ ok: false, err: 'bad channel' });
        patch.tgJobs = { on: !!body.tgJobs.on, ...(ch ? { channel: ch } : {}) };
      }
      if (body.hh) {
        const id = String(body.hh.employerId || '').trim();
        if (id && !RE.employerId.test(id)) return json({ ok: false, err: 'bad employerId' });
        patch.hh = { on: !!body.hh.on, employerId: id };
      }
      if (body.insta) {
        const u = String(body.insta.feedUrl || '').trim();
        if (u && !/^https:\/\//.test(u)) return json({ ok: false, err: 'bad feedUrl' });
        patch.insta = { on: !!body.insta.on, feedUrl: u };
      }
      const next = await saveSettings(patch);
      return json({ ok: true, settings: next });
    }

    return json({ ok: false, err: 'method' });
  } catch (e) {
    return json({ ok: false, err: String((e && e.message) || e) });
  }
};

export const config = { path: '/api/settings' };
