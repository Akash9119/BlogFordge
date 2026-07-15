const env = require('./config/env'); // validates env vars first — fails fast
const { connectDB, disconnectDB } = require('./config/db');
const app = require('./app');

/* eslint-disable no-console */

let server;

async function start() {
  await connectDB();
  server = app.listen(env.port, () => {
    console.log(`[server] BlogForge API listening on port ${env.port} (${env.nodeEnv})`);
  });
}

async function shutdown(signal) {
  console.log(`[server] ${signal} received — shutting down gracefully`);
  const timeout = setTimeout(() => {
    console.error('[server] Forced shutdown after 10s');
    process.exit(1);
  }, 10000).unref();

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
    clearTimeout(timeout);
    console.log('[server] Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('[server] Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
  shutdown('unhandledRejection');
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
  shutdown('uncaughtException');
});

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
