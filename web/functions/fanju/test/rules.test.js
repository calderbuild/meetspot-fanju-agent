import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planVenue, checkOrder, normalizePoi, UNVERIFIED_NOTE } from '../src/rules.js';

const people = [
  { who: '小王', budget_max: 100 },
  { who: '小李', avoid_seafood: true },
  { who: '小张', vegetarian: true },
  { who: '小陈', allergens: ['花生'] },
];

const poi = (name, type, cost, rating = '4.5') => ({ id: name, name, type, tag: [], biz_ext: { cost, rating } });

test('empty Amap fields ([]) become null', () => {
  const v = normalizePoi({ id: 'x', name: 'A', type: [], tag: [], biz_ext: { cost: [], rating: [] } });
  assert.equal(v.cost, null);
  assert.equal(v.type, '');
});

test('venue stage rejects with named reasons and never claims verification', () => {
  const { attempts, picks } = planVenue([
    poi('渔港海鲜酒家', '餐饮服务;中餐厅;海鲜酒楼', '150'),
    poi('老北京烤肉', '餐饮服务;中餐厅', '80'),
    poi('星巴克', '餐饮服务;咖啡厅', '40'),
    poi('家常小馆', '餐饮服务;中餐厅', '70'),
    poi('无价小馆', '餐饮服务;中餐厅', [], '4.9'),
  ], people);

  assert.equal(attempts.length, 4, 'cafe filtered out before screening');
  const seafood = attempts.find(a => a.venue.name === '渔港海鲜酒家');
  assert.deepEqual(seafood.violations.map(v => v.who).sort(), ['小张', '小李', '小王'].sort());
  assert.equal(attempts.find(a => a.venue.name === '老北京烤肉').violations[0].who, '小张');

  assert.deepEqual(picks.map(p => p.name), ['家常小馆', '无价小馆'], 'unknown price ranked last');
  assert.ok(picks.every(p => p.note.startsWith(UNVERIFIED_NOTE)));
  assert.match(picks[1].note, /价格未知/);
});

test('rejection reason quotes the field and keyword that matched', () => {
  const { attempts } = planVenue([{ id: 't', name: '财火铁锅炖', type: '餐饮服务;中餐厅', tag: '铁锅炖大鹅,铁锅炖鱼', biz_ext: { cost: '60', rating: '4.4' } }], people);
  const v = attempts[0].violations.find(v => v.who === '小李');
  assert.equal(v.reason, '招牌菜含「鱼」');
});

test('breakfast spots are not offered as a group dinner', () => {
  const { attempts } = planVenue([poi('海忠便民餐馆(和平里便民早餐点)', '餐饮服务;餐饮相关场所', '20')], people);
  assert.equal(attempts.length, 0);
});

const menu = [
  { name: '宫保鸡丁', price: 48 },
  { name: '清炒时蔬', price: 28 },
  { name: '麻婆豆腐', price: 32 },
  { name: '干煸四季豆', price: 30 },
  { name: '酸菜鱼', price: 88 },
];

test('a valid order passes and the total is computed by code', () => {
  const r = checkOrder(
    [{ name: '宫保鸡丁' }, { name: '清炒时蔬' }, { name: '麻婆豆腐' }, { name: '干煸四季豆' }, { name: '酸菜鱼' }],
    menu, people,
  );
  assert.deepEqual(r.problems, []);
  assert.equal(r.total, 226);
});

test('dish not on the menu is rejected', () => {
  const r = checkOrder([{ name: '北京烤鸭' }, { name: '清炒时蔬' }, { name: '麻婆豆腐' }, { name: '干煸四季豆' }, { name: '宫保鸡丁' }], menu, people);
  assert.ok(r.problems.some(p => p.includes('北京烤鸭')));
});

test('over budget triggers a problem', () => {
  const r = checkOrder([{ name: '酸菜鱼', qty: 5 }, { name: '清炒时蔬' }, { name: '麻婆豆腐' }, { name: '干煸四季豆' }, { name: '宫保鸡丁' }], menu, people);
  assert.ok(r.problems.some(p => p.includes('超过小王')));
});

test('allergen keyword produces a warning, not silence', () => {
  const r = checkOrder([{ name: '宫保鸡丁' }, { name: '清炒时蔬' }, { name: '麻婆豆腐' }, { name: '干煸四季豆' }, { name: '酸菜鱼' }],
    menu, [...people.slice(0, 3), { who: '小陈', allergens: ['鸡'] }]);
  assert.ok(r.warnings.some(w => w.includes('宫保鸡丁') && w.includes('小陈')));
});

test('vegetarian with fewer than two edible dishes is a problem', () => {
  const r = checkOrder([{ name: '宫保鸡丁' }, { name: '酸菜鱼' }, { name: '清炒时蔬' }, { name: '宫保鸡丁' }, { name: '酸菜鱼' }], menu, people);
  assert.ok(r.problems.some(p => p.startsWith('小张')));
});
