// Run: node --test api/_lib/token.test.js
// Configure the secret BEFORE requiring token.js (it reads the env at load).
process.env.UNLOCK_SECRET = process.env.UNLOCK_SECRET || 'test-signing-secret-not-real';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { createToken, verifyToken } = require('./token');

test('createToken returns <timestamp>.<16-hex-hmac>', () => {
  assert.match(createToken(), /^\d+\.[0-9a-f]{16}$/);
});

test('verifyToken accepts a freshly created token', () => {
  assert.equal(verifyToken(createToken()), true);
});

test('verifyToken rejects a tampered signature', () => {
  const [payload] = createToken().split('.');
  assert.equal(verifyToken(`${payload}.0000000000000000`), false);
});

test('verifyToken rejects a tampered payload (forged timestamp)', () => {
  const sig = createToken().split('.')[1];
  assert.equal(verifyToken(`9999999999999.${sig}`), false);
});

test('verifyToken rejects malformed/empty tokens', () => {
  for (const bad of ['', 'nodot', '.', undefined, null, 'a.b.c']) {
    assert.equal(verifyToken(bad), false, `should reject: ${JSON.stringify(bad)}`);
  }
});

test('verifyToken is not fooled by a token signed with a different secret', () => {
  const payload = Date.now().toString();
  const wrongSig = crypto.createHmac('sha256', 'WRONG-SECRET').update(payload).digest('hex').slice(0, 16);
  assert.equal(verifyToken(`${payload}.${wrongSig}`), false);
});
