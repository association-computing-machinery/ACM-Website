import app from './app.js';
import { closeDatabase } from './config/database.js';

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT is invalid');
// Loopback by default. Set HOST=0.0.0.0 to accept traffic from outside this
// machine (container, VM, reverse proxy) — there is no authentication in front
// of the API other than the session cookie, so only do that deliberately.
const host = process.env.HOST || '127.0.0.1';
const server = app.listen(port, host, () => console.log(`ACM API running at http://${host}:${port}`));

// A stuck request or a held connection must not block a restart forever.
const SHUTDOWN_GRACE_MS = Number(process.env.SHUTDOWN_GRACE_MS) || 10000;

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    console.log(`${signal} received — shutting down`);
    const force = setTimeout(() => {
      console.warn(`Shutdown did not finish within ${SHUTDOWN_GRACE_MS}ms; exiting anyway.`);
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    // Do not let the guard itself keep the process alive once work is done.
    force.unref();

    server.close(async () => {
      clearTimeout(force);
      await closeDatabase();
      process.exit(0);
    });
    server.closeIdleConnections();
  });
}
