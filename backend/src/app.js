import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDatabase, getDatabase } from './config/database.js';
import { healthRoutes } from './routes/health.js';
import { authProvider } from './config/auth.js';
import { authRoutes } from './routes/auth.js';
import { publicTeamRoutes, adminTeamRoutes } from './routes/team.js';
import { adminRoutes } from './routes/admins.js';
import { originGuard } from './security.js';
import { HttpError } from './validation.js';
import { uploadRoutes } from './routes/upload.js';
import { settingsRoutes } from './routes/settings.js';
import { coreTeamRoutes } from './routes/coreteam.js';
import { subTeamRoutes } from './routes/subteams.js';
import { projectRoutes } from './routes/projects.js';
import { sponsorRoutes } from './routes/sponsors.js';
import { profileRoutes } from './routes/profile.js';
import { recruitmentRoutes } from './routes/recruitment.js';
import { ituFestRoutes } from './routes/itufest.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// backend/src/app.js -> <repo>/frontend/dist
const staticDir = path.resolve(here, '../../frontend/dist');
const spaIndex = path.join(staticDir, 'index.html');

// A policy for the built single-page app: everything comes from this origin
// except the ImageKit CDN (images and the direct upload endpoint) and the
// Google Fonts host. `style-src` needs 'unsafe-inline' because the UI is styled
// with React style attributes and a few injected <style> blocks.
const SPA_CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://ik.imagekit.io",
  "connect-src 'self' https://upload.imagekit.io https://staticimgly.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export function createApp({ databaseCheck = checkDatabase, database = getDatabase, env = process.env, auth = authProvider(env) } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  const secureTransport = env.NODE_ENV === 'production' || Boolean(env.VERCEL);
  const serveFrontend = env.SERVE_FRONTEND
    ? env.SERVE_FRONTEND !== 'false'
    : existsSync(spaIndex);

  // Headers that apply to every response, JSON or static.
  app.use((_request, response, next) => {
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('X-Frame-Options', 'DENY');
    response.set('Referrer-Policy', 'no-referrer');
    response.set('Cross-Origin-Resource-Policy', 'same-origin');
    response.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    if (secureTransport) response.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // API responses are JSON only, so they get the strictest policy and must never
  // be cached. (The policy for the built frontend is set separately below: a
  // `default-src 'none'` document policy would break the app.)
  app.use('/api', (_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    response.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    next();
  });
  app.use('/api/profile/photo', express.raw({
    type: request => Boolean(request.is(['image/jpeg', 'image/png', 'image/webp'])),
    limit: 1024 * 1024,
  }));
  app.use('/api/itu-fest/form-photo', express.raw({
    type: request => Boolean(request.is(['image/jpeg', 'image/png', 'image/webp'])),
    limit: 1024 * 1024,
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', healthRoutes(databaseCheck));
  app.use('/api', originGuard(env));
  app.use('/api', (request, _response, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(request.method) &&
      (!request.body || typeof request.body !== 'object' || Array.isArray(request.body))) {
      const isPhotoUpload = request.method === 'POST' &&
        ['/api/profile/photo', '/api/itu-fest/form-photo'].includes(request.originalUrl.split('?')[0]) &&
        request.is(['image/jpeg', 'image/png', 'image/webp']);
      if (isPhotoUpload) return next();
      throw new HttpError(400, 'Send a JSON object.');
    }
    next();
  });
  app.use('/api/auth', authRoutes({ database, auth, env }));
  app.use('/api/team', publicTeamRoutes(database));
  app.use('/api/admin/team', adminTeamRoutes({ database, env }));
  app.use('/api/admin', adminRoutes({ database, env }));
  app.use('/api/upload', uploadRoutes({ database, env }));
  app.use('/api/settings', settingsRoutes({ database, env }));
  app.use('/api/core-team', coreTeamRoutes({ database, env }));
  app.use('/api/sub-teams', subTeamRoutes({ database, env }));
  app.use('/api/projects', projectRoutes({ database, env }));
  app.use('/api/sponsors', sponsorRoutes({ database, env }));
  app.use('/api/profile', profileRoutes({ database, env }));
  app.use('/api/recruitment', recruitmentRoutes({ database, env }));
  app.use('/api/itu-fest', ituFestRoutes({ database, env }));

  // Serve the built frontend when it exists, so a single host can run the whole
  // app. Content-hashed assets are cacheable; the shell is not.
  if (serveFrontend && existsSync(spaIndex)) {
    app.use(express.static(staticDir, { index: false, maxAge: '1h' }));
    app.use((request, response, next) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') return next();
      if (request.path.startsWith('/api')) return next();
      if (!request.accepts('html')) return next();
      response.set('Content-Security-Policy', SPA_CSP);
      response.set('Cache-Control', 'no-cache');
      response.sendFile(spaIndex, (error) => { if (error) next(error); });
    });
  }

  app.use((request, response) => {
    if (request.path.startsWith('/api')) response.status(404).json({ error: 'Not found' });
    else response.status(404).type('text/plain').send('Not found');
  });
  app.use((error, _request, response, _next) => {
    if (error instanceof HttpError) return response.status(error.status).json({ error: error.message });
    if (error.type === 'entity.parse.failed') return response.status(400).json({ error: 'Invalid JSON' });
    if (error.type === 'entity.too.large') return response.status(413).json({ error: 'Request too large' });
    console.error('API request failed:', error?.message || error);
    response.status(503).json({ error: 'The service is temporarily unavailable. Please try again later.' });
  });
  return app;
}

export default createApp();
