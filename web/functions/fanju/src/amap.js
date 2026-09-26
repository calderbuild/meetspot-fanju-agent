// Amap Web Service calls, one at a time: the key has a low QPS ceiling.
const BASE = 'https://restapi.amap.com/v3';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(path, params) {
  const q = new URLSearchParams({ ...params, key: process.env.AMAP_API_KEY });
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`${BASE}${path}?${q}`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    if (d.status === '1') return d;
    // Per-second quota: back off and retry; any other error is real.
    if (d.info !== 'CUQPS_HAS_EXCEEDED_THE_LIMIT' || attempt === 4) throw new Error(`高德接口失败：${d.info}`);
    await sleep(600 * attempt);
  }
}

export async function geocode(address, city) {
  const d = await get('/geocode/geo', { address, city });
  const hit = d.geocodes?.[0];
  if (!hit) throw new Error(`找不到地点「${address}」`);
  const [lng, lat] = hit.location.split(',').map(Number);
  return { lng, lat, formatted: hit.formatted_address };
}

export async function restaurantsAround({ lng, lat }, radius = 1500) {
  const pois = [];
  for (const page of [1, 2]) {
    const d = await get('/place/around', {
      location: `${lng.toFixed(6)},${lat.toFixed(6)}`,
      types: '050000',
      radius,
      offset: 25,
      page,
      extensions: 'all',
    });
    pois.push(...(d.pois ?? []));
    if ((d.pois ?? []).length < 25) break;
  }
  return pois;
}
