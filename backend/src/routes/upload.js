import { Router } from 'express';
import { createHmac, randomBytes } from 'node:crypto';
import { requireSession, requireRole } from '../security.js';

export function uploadRoutes({ database, env }) {
  const router = Router();
  router.use(requireSession(database, env), requireRole('ADMIN', 'SUPER_ADMIN'));

  /**
   * GET /api/upload/auth
   * Returns ImageKit auth params for direct client-side upload.
   */
  router.get('/auth', (_req, res) => {
    const privateKey = env.IMAGEKIT_PRIVATE_KEY;
    const token = randomBytes(16).toString('hex');
    // Keep a margin below ImageKit's one-hour maximum so request latency and
    // clock-second rounding cannot make the authorization invalid.
    const expire = Math.floor(Date.now() / 1000) + 3000;
    const signature = createHmac('sha1', privateKey)
      .update(token + expire)
      .digest('hex');

    res.json({
      token,
      expire,
      signature,
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    });
  });

  return router;
}
