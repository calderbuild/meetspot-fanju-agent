// Deterministic rules for both stages. No LLM, no network: everything here must be
// explainable to a judge line by line.

export const UNVERIFIED_NOTE = '按品类初筛，未核实';
export const ALLERGY_DISCLAIMER = '过敏原请向店员确认';

const SEAFOOD = /海鲜|海产|虾|蟹|贝|蚝|鲍|刺身|寿司|日本料理|鱼/;
const MEAT_CENTRIC = /烧烤|烤肉|烤串|烤鸭|牛排|羊蝎子|炸鸡|涮肉|牛肉|羊肉|肉蟹|海鲜/;
const MEAT_DISH = /肉|鸡|鸭|鹅|牛|羊|猪|排骨|肠|肚|腰|肝|虾|蟹|鱼|贝|蚝|鲍|培根|火腿/;
const NOT_A_MEAL = /咖啡|茶|甜品|面包|冷饮|糕饼|酒吧/;

// Amap returns [] for empty fields; treat that the same as missing.
const text = v => (typeof v === 'string' ? v : '');

export function normalizePoi(p) {
  const cost = parseFloat(text(p.biz_ext?.cost));
  return {
    id: p.id,
    name: text(p.name),
    type: text(p.type),
    tag: text(p.tag),
    address: text(p.address),
    rating: parseFloat(text(p.biz_ext?.rating)) || null,
    cost: Number.isFinite(cost) ? cost : null,
  };
}

function allergenPattern(allergen) {
  return /海鲜|虾|蟹|贝/.test(allergen) ? SEAFOOD : new RegExp(allergen);
}

// Stage 1: exclusion only. Passing venues are never claimed to satisfy anything.
export function screenVenue(venue, people) {
  const haystack = `${venue.name} ${venue.type} ${venue.tag}`;
  const violations = [];
  for (const p of people) {
    if (p.budget_max && venue.cost !== null && venue.cost > p.budget_max) {
      violations.push({ who: p.who, rule: '预算', reason: `人均 ${venue.cost} 元，超过 ${p.budget_max} 元` });
    }
    if (p.avoid_seafood && SEAFOOD.test(haystack)) {
      violations.push({ who: p.who, rule: '不吃海鲜', reason: '店名或品类是海鲜类' });
    }
    if (p.vegetarian && MEAT_CENTRIC.test(haystack)) {
      violations.push({ who: p.who, rule: '吃素', reason: '店名或品类以肉食为主' });
    }
    for (const a of p.allergens ?? []) {
      if (allergenPattern(a).test(haystack)) {
        violations.push({ who: p.who, rule: `${a}过敏`, reason: `店名或品类涉及${a}` });
      }
    }
  }
  return violations;
}

export function planVenue(pois, people, want = 3) {
  const venues = pois.map(normalizePoi).filter(v => !NOT_A_MEAL.test(`${v.name} ${v.type}`));
  const attempts = venues.map(venue => {
    const violations = screenVenue(venue, people);
    return { venue, accepted: violations.length === 0, violations };
  });
  // Known price first, then rating. Unknown price is kept but ranked last.
  const picks = attempts
    .filter(a => a.accepted)
    .sort((a, b) => (a.venue.cost === null) - (b.venue.cost === null) || (b.venue.rating ?? 0) - (a.venue.rating ?? 0))
    .slice(0, want)
    .map(a => ({ ...a.venue, note: a.venue.cost === null ? `${UNVERIFIED_NOTE}；价格未知` : UNVERIFIED_NOTE }));
  return { attempts, picks };
}

export function explainRejection(attempt) {
  return `${attempt.venue.name}：` + attempt.violations.map(v => `${v.who}（${v.rule}）${v.reason}`).join('；');
}

// Stage 2 --------------------------------------------------------------------

function excludedFor(person, dishName) {
  if (person.vegetarian && MEAT_DISH.test(dishName)) return '吃素';
  if (person.avoid_seafood && SEAFOOD.test(dishName)) return '不吃海鲜';
  const hit = (person.allergens ?? []).find(a => allergenPattern(a).test(dishName));
  return hit ? `${hit}过敏` : null;
}

// plan: [{name, qty}]; menu: [{name, price}]. Returns problems the LLM must fix,
// plus warnings and the total, both computed here and never taken from the LLM.
export function checkOrder(plan, menu, people) {
  const prices = new Map(menu.map(d => [d.name.trim(), d.price]));
  const problems = [];
  const warnings = [];
  let total = 0;
  for (const item of plan) {
    const name = item.name.trim();
    if (!prices.has(name)) {
      problems.push(`「${name}」不在菜单上`);
      continue;
    }
    total += prices.get(name) * (item.qty ?? 1);
    for (const p of people) {
      const why = excludedFor(p, name);
      if (why?.endsWith('过敏')) warnings.push(`「${name}」可能含${why.slice(0, -2)}，${p.who}注意`);
    }
  }
  const headcount = people.length;
  const target = headcount + 1; // ponytail: rule of thumb, labelled as an estimate in the UI
  if (Math.abs(plan.length - target) > 1) problems.push(`${headcount} 人建议点 ${target} 道左右，现在是 ${plan.length} 道`);
  for (const p of people) {
    const edible = plan.filter(i => prices.has(i.name.trim()) && !excludedFor(p, i.name.trim())).length;
    if (edible < 2) problems.push(`${p.who}能吃的菜只有 ${edible} 道`);
    if (p.budget_max && total / headcount > p.budget_max) {
      problems.push(`人均 ${(total / headcount).toFixed(0)} 元，超过${p.who}的 ${p.budget_max} 元`);
    }
  }
  return { ok: problems.length === 0, problems, warnings, total, perPerson: Math.round(total / headcount) };
}
