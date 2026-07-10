// Live vacancies from HeadHunter (api.hh.ru serves hh.kz too). Anonymous API — only a
// User-Agent header is required. Contract: ALWAYS HTTP 200 JSON, {ok, items:[...]}.
// Gated by the integrations settings (hh.on + employerId); results cached in Blobs 10 min.
import { getSettings, readJSON, writeJSON, writeHealth, json, RE } from './lib/store.mjs';

const TTL = 600000;
const CACHE = 'public, s-maxage=600, stale-while-revalidate=3600';

export default async () => {
  try {
    const cfg = await getSettings();
    if (!cfg.hh.on || !RE.employerId.test(cfg.hh.employerId)) {
      return json({ ok: false, items: [], off: true }, CACHE);
    }

    const cached = await readJSON('cache/vacancies.json');
    if (cached && Date.now() - cached.t < TTL && Array.isArray(cached.items)) {
      return json({ ok: cached.items.length > 0, items: cached.items }, CACHE);
    }

    const r = await fetch(
      'https://api.hh.ru/vacancies?employer_id=' + cfg.hh.employerId + '&per_page=20&order_by=publication_time',
      { headers: { 'User-Agent': 'DDC-Site/1.0 (muha.ddcnb@gmail.com)', 'HH-User-Agent': 'DDC-Site/1.0 (muha.ddcnb@gmail.com)' } }
    );
    if (!r.ok) throw new Error('hh ' + r.status);
    const data = await r.json();
    const items = (data.items || []).map((v) => ({
      name: v.name,
      salary: v.salary ? { from: v.salary.from, to: v.salary.to, currency: v.salary.currency } : null,
      area: (v.area && v.area.name) || '',
      url: v.alternate_url,
      published: v.published_at,
      req: ((v.snippet && v.snippet.requirement) || '').replace(/<[^>]+>/g, '').slice(0, 200),
    }));

    await writeJSON('cache/vacancies.json', { t: Date.now(), items });
    await writeHealth('vacancies', true, items.length, '');
    return json({ ok: items.length > 0, items }, CACHE);
  } catch (e) {
    await writeHealth('vacancies', false, 0, (e && e.message) || e);
    return json({ ok: false, items: [], err: String((e && e.message) || e) }, CACHE);
  }
};

export const config = { path: '/api/vacancies' };
