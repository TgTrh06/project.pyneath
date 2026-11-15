const test = require('node:test');
const assert = require('node:assert/strict');
const { quoteIdentifier } = require('./verify-database-restore.cjs');

test('restore verifier quotes database identifiers', () => {
  assert.equal(quoteIdentifier('study_steps'), '"study_steps"');
  assert.equal(quoteIdentifier('odd"name'), '"odd""name"');
});
