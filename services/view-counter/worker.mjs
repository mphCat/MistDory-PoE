// Deploy only on Cloudflare: CF-Connecting-IP must come from its trusted edge.
export const UPSERT_VIEW = `INSERT INTO view_cooldowns (visitor_hash, last_seen) VALUES (?, ?)
ON CONFLICT(visitor_hash) DO UPDATE SET last_seen = MAX(view_cooldowns.last_seen, excluded.last_seen)`;
export const READ_TOTAL = 'SELECT total FROM view_totals WHERE id = 1';

export async function recordView(db, visitorHash, now) {
  // D1 batches are transactional. Triggers increment the total atomically with the cooldown.
  const results = await db.batch([
    db.prepare(UPSERT_VIEW).bind(visitorHash, now),
    db.prepare(READ_TOTAL)
  ]);
  const total = results[1].results[0]?.total;
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Counter data unavailable');
  return total;
}

export async function hashVisitor(ip, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(ip));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.SITE_ORIGIN || 'https://mphcat.github.io';
    const origin = request.headers.get('Origin');
    const headers = {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin'
    };
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (new URL(request.url).pathname !== '/views') return reply({ error: 'Not found' }, 404);
    if (origin !== allowedOrigin) return reply({ error: 'Origin not allowed' }, 403);
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS' } });
    }
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    const ip = request.headers.get('CF-Connecting-IPv6') || request.headers.get('CF-Connecting-IP');
    if (!ip || ip.length > 64 || !/^[a-fA-F0-9:.]+$/.test(ip)) return reply({ error: 'Visitor identity unavailable' }, 400);
    if (!env.DB || typeof env.IP_HASH_SECRET !== 'string' || env.IP_HASH_SECRET.length < 32) {
      return reply({ error: 'Counter unavailable' }, 503);
    }
    try {
      const visitorHash = await hashVisitor(ip, env.IP_HASH_SECRET);
      const total = await recordView(env.DB, visitorHash, Date.now());
      return reply({ total });
    } catch {
      // Do not log IPs, hashes, secrets, or database errors to a public response.
      return reply({ error: 'Counter unavailable' }, 503);
    }
  },
  async scheduled(event, env, context) {
    // Delete expired pseudonymous cooldowns, never the cumulative total.
    context.waitUntil(env.DB.prepare('DELETE FROM view_cooldowns WHERE last_seen < ?')
      .bind(Date.now() - 24 * 60 * 60 * 1000).run());
  }
};