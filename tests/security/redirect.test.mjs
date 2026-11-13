import test from 'node:test';
import assert from 'node:assert/strict';
import { safeRedirect } from '../../lib/auth/redirect.mjs';
test('rejects scripts, external URLs and parser normalization escapes', () => {
  for (const input of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'https://evil.test', '//evil.test', '/a/..//evil.test', '/a/%2e%2e//evil.test', '/\\evil.test', '/\t/evil.test', '\n/dashboard', '', null]) assert.equal(safeRedirect(input), '/dashboard');
});
test('preserves internal deep links and query parameters', () => {
  assert.equal(safeRedirect('/invoices/42?edit=1#items'), '/invoices/42?edit=1#items');
});
