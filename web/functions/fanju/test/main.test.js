import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../src/main.js';

// Queue of model replies; each fetch to the model endpoint pops one.
function stubModel(replies) {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(replies.shift()) } }] }),
  });
}

async function call(body) {
  let out;
  const res = { json: (data, status = 200) => (out = { status, ...data }) };
  await handler({ req: { bodyJson: body }, res, error: () => {} });
  return out;
}

const menu = [
  { name: '宫保鸡丁', price: 48 },
  { name: '清炒时蔬', price: 28 },
  { name: '麻婆豆腐', price: 32 },
  { name: '干煸四季豆', price: 30 },
];
const people = [{ who: '甲', vegetarian: true }, { who: '乙', budget_max: 100 }, { who: '丙' }];

test('plan-order retries once when the first plan breaks a rule', async () => {
  stubModel([
    { dishes: [{ name: '北京烤鸭' }, { name: '宫保鸡丁' }, { name: '清炒时蔬' }, { name: '麻婆豆腐' }] },
    { dishes: [{ name: '宫保鸡丁' }, { name: '清炒时蔬' }, { name: '麻婆豆腐' }, { name: '干煸四季豆' }] },
  ]);
  const r = await call({ action: 'plan-order', menu, people });
  assert.equal(r.success, true);
  assert.equal(r.data.retried, true);
  assert.equal(r.data.ok, true);
  assert.equal(r.data.total, 138);
  assert.equal(r.data.disclaimer, '过敏原请向店员确认');
});

test('plan-order reports problems honestly when the retry still fails', async () => {
  stubModel([{ dishes: [{ name: '宫保鸡丁' }] }, { dishes: [{ name: '宫保鸡丁' }] }]);
  const r = await call({ action: 'plan-order', menu, people });
  assert.equal(r.data.ok, false);
  assert.ok(r.data.problems.length > 0);
});

test('read-menu drops nameless rows and keeps unreadable prices as null', async () => {
  stubModel([{ dishes: [{ name: '宫保鸡丁', price: 48 }, { name: '', price: 10 }, { name: '时价海鲜', price: '时价' }] }]);
  const r = await call({ action: 'read-menu', image: 'data:image/jpeg;base64,AAAA' });
  assert.deepEqual(r.data.dishes, [{ name: '宫保鸡丁', price: 48 }, { name: '时价海鲜', price: null }]);
});

test('unknown action and bad input fail with a message, not a crash', async () => {
  assert.equal((await call({ action: 'nope' })).status, 400);
  const r = await call({ action: 'plan-venue', people: [{ who: 'a' }] });
  assert.equal(r.status, 500);
  assert.match(r.message, /2 到 8/);
});

test('who a dish suits comes from rules, not from model text', async () => {
  stubModel([{ dishes: [{ name: '宫保鸡丁', why: '适合吃素的甲' }, { name: '清炒时蔬' }, { name: '麻婆豆腐' }, { name: '干煸四季豆' }] }]);
  const r = await call({ action: 'plan-order', menu, people });
  const gongbao = r.data.dishes.find(d => d.name === '宫保鸡丁');
  assert.deepEqual(gongbao.fitsFor, ['乙', '丙']);
  assert.equal('why' in gongbao, false);
});
