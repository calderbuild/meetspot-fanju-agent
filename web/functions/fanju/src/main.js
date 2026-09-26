import { geocode, restaurantsAround } from './amap.js';
import { chatJson } from './llm.js';
import { planVenue, checkOrder, explainRejection, ALLERGY_DISCLAIMER } from './rules.js';

const PARSE_PROMPT = `你把每个人对聚餐的一句话要求整理成 JSON。只根据原话，不要补充原话里没有的限制。
输出格式：{"people":[{"who":"称呼","vegetarian":布尔,"avoid_seafood":布尔,"allergens":["过敏原"],"budget_max":人均预算数字或null,"spicy":"like"|"avoid"|"any","cuisines_like":["想吃的菜系"]}]}
people 的顺序和输入一致。`;

const MENU_PROMPT = `这是一张餐厅菜单照片。逐条读出能看清的菜名和价格，输出 JSON：{"dishes":[{"name":"菜名","price":数字或null}]}。
只写照片里真实出现的菜，看不清的价格写 null，不要猜，不要补充照片上没有的菜。`;

const ORDER_PROMPT = `你是聚餐点菜助手。只能从给定菜单里选菜，菜名必须一字不差。
根据每个人的限制和人数给出点菜方案，输出 JSON：{"dishes":[{"name":"菜名","qty":份数,"why":"一句理由"}]}。
照顾每个人都有至少两道能吃的菜，控制在预算内。`;

function toPerson(raw, input) {
  return {
    who: String(input.who || raw?.who || '').slice(0, 20),
    raw: input.text,
    vegetarian: raw?.vegetarian === true,
    avoid_seafood: raw?.avoid_seafood === true,
    allergens: Array.isArray(raw?.allergens) ? raw.allergens.map(String).slice(0, 5) : [],
    budget_max: Number.isFinite(raw?.budget_max) && raw.budget_max > 0 ? raw.budget_max : null,
    spicy: ['like', 'avoid'].includes(raw?.spicy) ? raw.spicy : 'any',
    cuisines_like: Array.isArray(raw?.cuisines_like) ? raw.cuisines_like.map(String).slice(0, 5) : [],
  };
}

async function planVenueAction({ city, people }) {
  if (!Array.isArray(people) || people.length < 2 || people.length > 8) throw new Error('需要 2 到 8 个人');
  const parsed = await chatJson([
    { role: 'system', content: PARSE_PROMPT },
    { role: 'user', content: JSON.stringify(people.map(p => ({ who: p.who, 原话: p.text }))) },
  ]);
  const constraints = people.map((p, i) => toPerson(parsed.people?.[i], p));

  const points = [];
  for (const p of people) points.push(await geocode(p.from, city));
  const center = {
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
  };
  const pois = await restaurantsAround(center);
  const { attempts, picks } = planVenue(pois, constraints);
  return {
    constraints,
    center,
    rejected: attempts.filter(a => !a.accepted).slice(0, 8).map(a => ({ name: a.venue.name, text: explainRejection(a), violations: a.violations })),
    screened: attempts.length,
    picks,
  };
}

async function readMenuAction({ image }) {
  if (typeof image !== 'string' || !image.startsWith('data:image/')) throw new Error('请上传一张菜单照片');
  if (image.length > 4_000_000) throw new Error('照片太大，请压缩后再传');
  const d = await chatJson([
    { role: 'system', content: MENU_PROMPT },
    { role: 'user', content: [{ type: 'image_url', image_url: { url: image } }, { type: 'text', text: '请读出菜单。' }] },
  ]);
  const dishes = (d.dishes ?? [])
    .filter(x => typeof x?.name === 'string' && x.name.trim())
    .map(x => ({ name: x.name.trim().slice(0, 40), price: Number.isFinite(x.price) && x.price > 0 ? x.price : null }))
    .slice(0, 150);
  return { dishes };
}

async function planOrderAction({ menu, people }) {
  const priced = (menu ?? []).filter(d => d?.name && Number.isFinite(d.price) && d.price > 0);
  if (priced.length < 3) throw new Error('菜单里带价格的菜不到 3 道');
  const ask = [
    { role: 'system', content: ORDER_PROMPT },
    { role: 'user', content: JSON.stringify({ 人数: people.length, 建议菜数: people.length + 1, 每个人: people, 菜单: priced }) },
  ];
  let plan = (await chatJson(ask)).dishes ?? [];
  let check = checkOrder(plan, priced, people);
  let retried = false;
  if (!check.ok) {
    retried = true;
    ask.push({ role: 'assistant', content: JSON.stringify({ dishes: plan }) });
    ask.push({ role: 'user', content: `这个方案有问题，请修正后重新输出完整 JSON：${check.problems.join('；')}` });
    plan = (await chatJson(ask)).dishes ?? [];
    check = checkOrder(plan, priced, people);
  }
  const prices = new Map(priced.map(d => [d.name.trim(), d.price]));
  return {
    dishes: plan
      .filter(i => prices.has(String(i.name).trim()))
      .map(i => ({ name: i.name.trim(), qty: i.qty ?? 1, price: prices.get(i.name.trim()), why: String(i.why ?? '').slice(0, 60) })),
    ...check,
    retried,
    disclaimer: ALLERGY_DISCLAIMER,
  };
}

const ACTIONS = { 'plan-venue': planVenueAction, 'read-menu': readMenuAction, 'plan-order': planOrderAction };

export default async ({ req, res, error }) => {
  const body = req.bodyJson ?? {};
  const action = ACTIONS[body.action];
  if (!action) return res.json({ success: false, message: '未知操作' }, 400);
  try {
    return res.json({ success: true, data: await action(body) });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    error(`${body.action}: ${message}`);
    return res.json({ success: false, message }, 500);
  }
};
