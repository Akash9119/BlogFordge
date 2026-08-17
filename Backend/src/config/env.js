const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const REQUIRED = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `[env] Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n` +
      'Copy Backend/.env.example to Backend/.env and fill in the values.'
  );
  process.exit(1);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

if (isProduction) {
  const weak = ['JWT_SECRET', 'JWT_REFRESH_SECRET'].filter((k) => process.env[k].length < 32);
  if (weak.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`[env] In production these secrets must be at least 32 characters: ${weak.join(', ')}`);
    process.exit(1);
  }
  // The AI service has no auth of its own — the shared token is the only thing
  // in front of it, so an unset one in production is an open door.
  if (process.env.AI_SERVICE_URL && !process.env.AI_SERVICE_TOKEN) {
    // eslint-disable-next-line no-console
    console.error('[env] AI_SERVICE_URL is set but AI_SERVICE_TOKEN is empty — refusing to start.');
    process.exit(1);
  }
}

module.exports = {
  nodeEnv,
  isProduction,
  port: Number.parseInt(process.env.PORT, 10) || 5000,
  trustProxy: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    accessSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  /**
   * The FastAPI RAG microservice. Optional on purpose: with no AI_SERVICE_URL
   * the API boots exactly as before and the /ai routes answer 503 — Phase 3 is
   * additive, it never becomes a startup dependency of Phase 1.
   */
  ai: {
    enabled: Boolean(process.env.AI_SERVICE_URL),
    serviceUrl: (process.env.AI_SERVICE_URL || '').replace(/\/+$/, ''),
    serviceToken: process.env.AI_SERVICE_TOKEN || '',
    // Generation is slow; indexing is a background call nobody waits on.
    timeoutMs: Number.parseInt(process.env.AI_SERVICE_TIMEOUT_MS, 10) || 60000,
    ingestTimeoutMs: Number.parseInt(process.env.AI_INGEST_TIMEOUT_MS, 10) || 120000,
  },
};
