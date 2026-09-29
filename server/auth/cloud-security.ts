import type {FastifyInstance} from 'fastify';
import type {CloudConfig} from '../config.js';
export function createAuthAttemptLimiter(now: () => number) {
  const sources = new Map<string, {count: number; expires: number}>();
  let global = {count: 0, expires: 0};
  return {take(ip: string) {
    const time = now();
    for (const [key, value] of sources) if (value.expires <= time) sources.delete(key);
    if (global.expires <= time) global = {count: 0, expires: time + 60_000};
    const source = sources.get(ip);
    const blockedUntil = Math.max(
      global.count >= 20 ? global.expires : 0,
      source && source.count >= 5 ? source.expires : 0,
      !source && sources.size >= 1024 ? time + 60_000 : 0,
    );
    if (blockedUntil > time) return {allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - time) / 1000))};
    global.count++;
    sources.set(ip, {count: (source?.count ?? 0) + 1, expires: source?.expires ?? time + 60_000});
    return {allowed: true, retryAfterSeconds: 0};
  }};
}

export function registerCloudSecurity(app: FastifyInstance, cloud: CloudConfig, now = Date.now): void {
  const host = new URL(cloud.siteOrigin).host;
  const writes = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  const limitedRoutes = new Set(['setup', 'login', 'password'].map(name => `/api/admin/auth/${name}`));
  const limiter = createAuthAttemptLimiter(now);
  app.addHook('onRequest', async (request, reply) => {
    if (request.headers.host !== host) {
      return reply.code(421).send({error: {code: 'INVALID_HOST', message: '请求域名不匹配'}});
    }
    const route = request.routeOptions.url ?? '';
    if (writes.has(request.method) && route.startsWith('/api/admin/') && request.headers.origin !== cloud.siteOrigin) {
      return reply.code(403).send({error: {code: 'INVALID_ORIGIN', message: '请求来源不受信任'}});
    }
    if (request.method === 'POST' && limitedRoutes.has(route)) {
      const result = limiter.take(request.ip);
      if (!result.allowed) return reply.code(429).header('Retry-After', result.retryAfterSeconds)
        .send({error: {code: 'AUTH_RATE_LIMIT', message: '尝试过于频繁，请稍后重试'}});
    }
  });
}
