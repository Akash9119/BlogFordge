/**
 * Create (or promote) the admin account.
 * Public registration always yields the 'author' role, so the first admin
 * must be seeded explicitly:
 *
 *   Set ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD in Backend/.env, then:
 *   npm run seed:admin
 */
/* eslint-disable no-console */
const env = require('../src/config/env');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

async function main() {
  const name = process.env.ADMIN_NAME || 'Admin';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('[seed] Set ADMIN_EMAIL and ADMIN_PASSWORD in Backend/.env first.');
    process.exit(1);
  }
  if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    console.error('[seed] ADMIN_PASSWORD must be 8+ characters with at least one letter and one number.');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (existing.role === 'admin') {
      console.log(`[seed] '${email}' is already an admin — nothing to do.`);
    } else {
      existing.role = 'admin';
      await existing.save();
      console.log(`[seed] Promoted existing user '${email}' to admin.`);
    }
  } else {
    await User.create({ name, email, password, role: 'admin' });
    console.log(`[seed] Created admin account '${email}'.`);
  }

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
