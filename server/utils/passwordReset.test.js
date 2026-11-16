const test = require('node:test');
const assert = require('node:assert/strict');
const { createResetToken, hashResetToken } = require('./passwordReset');

test('reset tokens are random and only their SHA-256 hash is stored', () => {
  const first = createResetToken();
  const second = createResetToken();

  assert.match(first.token, /^[a-f0-9]{64}$/);
  assert.match(first.tokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, first.tokenHash);
  assert.notEqual(first.token, second.token);
  assert.equal(hashResetToken(first.token), first.tokenHash);
});
