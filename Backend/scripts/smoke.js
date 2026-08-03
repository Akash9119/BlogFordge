/**
 * End-to-end smoke test against a RUNNING BlogForge API.
 *
 * Start the server first (`npm run dev`), then in another terminal:
 *   npm run smoke
 *
 * Targets http://127.0.0.1:$PORT by default. To test a deployed instance:
 *   SMOKE_BASE_URL=https://your-api.onrender.com npm run smoke
 *
 * Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD in .env (the seeded admin).
 * Everything the run creates is deleted again on the way out.
 */
/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE = (process.env.SMOKE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}`).replace(/\/$/, '');
const API = `${BASE}/api/v1`;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();

let pass = 0;
let fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` -> ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function req(method, urlPath, { token, body, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(raw ? `${BASE}${urlPath}` : `${API}${urlPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response (204, HTML error page, ...) */
  }
  return { status: res.status, body: json };
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('[smoke] Set ADMIN_EMAIL and ADMIN_PASSWORD in .env, then run `npm run seed:admin`.');
    process.exit(1);
  }

  console.log(`[smoke] Target: ${BASE}\n`);

  try {
    await fetch(`${BASE}/health`);
  } catch (err) {
    console.error(`[smoke] Cannot reach ${BASE} — is the server running? (${err.message})`);
    process.exit(1);
  }

  const created = { postId: null, catId: null, tagId: null, commentId: null };
  let token = null;
  let refreshToken = null;

  console.log('--- health ---');
  const health = await req('GET', '/health', { raw: true });
  check('GET /health returns 200', health.status === 200, `got ${health.status}`);
  check('health reports db connected', health.body?.data?.db === 'connected', JSON.stringify(health.body?.data));

  console.log('\n--- auth ---');
  const login = await req('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  check('admin login returns 200', login.status === 200, `got ${login.status}: ${JSON.stringify(login.body)}`);
  token = login.body?.data?.accessToken;
  refreshToken = login.body?.data?.refreshToken;
  check('login returns accessToken', !!token);
  check('login returns refreshToken', !!refreshToken);
  check('response envelope shape', !!login.body && 'success' in login.body && 'data' in login.body);

  if (!token) {
    console.error('\n[smoke] Login failed — aborting before the authenticated checks.');
    report();
    return;
  }

  const badLogin = await req('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: 'wrongpassword123' } });
  check('wrong password rejected (401)', badLogin.status === 401, `got ${badLogin.status}`);

  const me = await req('GET', '/auth/me', { token });
  check('GET /auth/me returns 200', me.status === 200, `got ${me.status}`);
  const meUser = me.body?.data?.user || me.body?.data;
  check('seeded user has admin role', meUser?.role === 'admin', `role=${meUser?.role}`);
  check('password never serialized', meUser && !('password' in meUser));

  const noAuth = await req('GET', '/auth/me');
  check('unauthenticated /auth/me rejected (401)', noAuth.status === 401, `got ${noAuth.status}`);

  console.log('\n--- validation ---');
  const badPost = await req('POST', '/posts', { token, body: { title: '' } });
  check('empty title rejected (422/400)', badPost.status === 422 || badPost.status === 400, `got ${badPost.status}`);
  check('validation error lists fields', Array.isArray(badPost.body?.errors), JSON.stringify(badPost.body));

  console.log('\n--- taxonomy ---');
  const suffix = Date.now();
  const cat = await req('POST', '/categories', { token, body: { name: `Smoke Cat ${suffix}` } });
  check('create category 201', cat.status === 201, `got ${cat.status}: ${JSON.stringify(cat.body)}`);
  const catDoc = cat.body?.data?.category || cat.body?.data;
  created.catId = catDoc?._id;
  check('category got a slug', !!catDoc?.slug, JSON.stringify(catDoc));

  const tag = await req('POST', '/tags', { token, body: { name: `Smoke Tag ${suffix}` } });
  check('create tag 201', tag.status === 201, `got ${tag.status}: ${JSON.stringify(tag.body)}`);
  const tagDoc = tag.body?.data?.tag || tag.body?.data;
  created.tagId = tagDoc?._id;

  console.log('\n--- posts ---');
  const post = await req('POST', '/posts', {
    token,
    body: {
      title: `Smoke Test Post ${suffix}`,
      content: 'Smoke test content used to verify the API end to end.',
      excerpt: 'smoke test',
      categories: created.catId ? [created.catId] : undefined,
      tags: created.tagId ? [created.tagId] : undefined,
    },
  });
  check('create post 201', post.status === 201, `got ${post.status}: ${JSON.stringify(post.body)}`);
  const postDoc = post.body?.data?.post || post.body?.data;
  created.postId = postDoc?._id;
  const slug = postDoc?.slug;
  check('post created as draft', postDoc?.status === 'draft', `status=${postDoc?.status}`);
  check('slug auto-generated', !!slug && slug.includes('smoke-test-post'), `slug=${slug}`);

  const anonDraft = await req('GET', `/posts/${slug}`);
  check('anonymous cannot read draft', anonDraft.status === 404 || anonDraft.status === 403, `got ${anonDraft.status}`);

  const pub = await req('PATCH', `/posts/${created.postId}/publish`, { token });
  check('publish post 200', pub.status === 200, `got ${pub.status}: ${JSON.stringify(pub.body)}`);
  const pubDoc = pub.body?.data?.post || pub.body?.data;
  check('status is published', pubDoc?.status === 'published', `status=${pubDoc?.status}`);
  check('publishedAt set', !!pubDoc?.publishedAt);

  const anonRead = await req('GET', `/posts/${slug}`);
  check('anonymous CAN read published post', anonRead.status === 200, `got ${anonRead.status}`);

  const list = await req('GET', '/posts?page=1&limit=5');
  check('public post listing 200', list.status === 200, `got ${list.status}`);
  check('listing returns pagination meta', typeof list.body?.meta?.total === 'number', JSON.stringify(list.body?.meta));

  const search = await req('GET', `/posts?q=${encodeURIComponent('Smoke Test Post')}`);
  check('text search 200', search.status === 200, `got ${search.status}`);

  console.log('\n--- analytics ---');
  const view = await req('POST', `/posts/${created.postId}/views`);
  check('record view 200/201', view.status === 200 || view.status === 201, `got ${view.status}`);
  const overview = await req('GET', '/analytics/overview', { token });
  check('analytics overview 200', overview.status === 200, `got ${overview.status}`);

  console.log('\n--- comments ---');
  const comment = await req('POST', `/posts/${created.postId}/comments`, { token, body: { content: 'Smoke test comment.' } });
  check('create comment 201', comment.status === 201, `got ${comment.status}: ${JSON.stringify(comment.body)}`);
  const cDoc = comment.body?.data?.comment || comment.body?.data;
  created.commentId = cDoc?._id;
  check('staff comment auto-approved', cDoc?.status === 'approved', `status=${cDoc?.status}`);

  console.log('\n--- refresh rotation ---');
  const refreshed = await req('POST', '/auth/refresh', { body: { refreshToken } });
  check('refresh returns 200', refreshed.status === 200, `got ${refreshed.status}: ${JSON.stringify(refreshed.body)}`);
  const newRefresh = refreshed.body?.data?.refreshToken;
  check('refresh issues a NEW refresh token', !!newRefresh && newRefresh !== refreshToken);

  const reuse = await req('POST', '/auth/refresh', { body: { refreshToken } });
  check('replaying the old refresh token is rejected (401)', reuse.status === 401, `got ${reuse.status}`);

  console.log('\n--- cleanup ---');
  // Reuse detection above revoked the whole session family, so log in again.
  const relog = await req('POST', '/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  token = relog.body?.data?.accessToken;

  const del = async (label, urlPath) => {
    const r = await req('DELETE', urlPath, { token });
    check(label, r.status === 200 || r.status === 204, `got ${r.status}`);
  };
  if (created.commentId) await del('delete comment', `/comments/${created.commentId}`);
  if (created.postId) await del('delete post', `/posts/${created.postId}`);
  if (created.catId) await del('delete category', `/categories/${created.catId}`);
  if (created.tagId) await del('delete tag', `/tags/${created.tagId}`);

  // Logging out here also drops the refresh token this run created.
  if (relog.body?.data?.refreshToken) {
    await req('POST', '/auth/logout', { body: { refreshToken: relog.body.data.refreshToken } });
  }

  report();
}

function report() {
  console.log(`\n================  ${pass} passed, ${fail} failed  ================`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\n[smoke] Harness crashed:', err);
  process.exit(1);
});
