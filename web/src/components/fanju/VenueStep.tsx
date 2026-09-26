import type { Constraint, Venue, VenuePlan } from "@/services/fanjuService";

import { Step, yuan } from "./shared";

function readConstraint(c: Constraint) {
  const parts = [
    c.vegetarian && "吃素",
    c.avoid_seafood && "不吃海鲜",
    ...c.allergens.map(a => `${a}过敏`),
    c.budget_max && `人均 ≤ ${c.budget_max}`,
    c.spicy === "like" && "想吃辣",
    c.spicy === "avoid" && "不吃辣",
    ...c.cuisines_like.map(x => `想吃${x}`),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "没有限制";
}

interface Props {
  plan: VenuePlan;
  chosen: Venue | null;
  onChoose: (v: Venue) => void;
}

export function VenueStep({ plan, chosen, onChoose }: Props) {
  return (
    <Step n={2} title="去哪吃">
      <h3 className="mb-2 text-sm text-muted-foreground">我是这样理解每个人的要求的</h3>
      <dl className="mb-5 divide-y rounded-md border bg-card text-sm">
        {plan.constraints.map(c => (
          <div key={c.who} className="grid grid-cols-[4rem_1fr] gap-2 px-3 py-2">
            <dt className="font-medium">{c.who}</dt>
            <dd>
              <span className="font-hand text-base text-muted-foreground">“{c.raw}”</span>
              <span className="block">{readConstraint(c)}</span>
            </dd>
          </div>
        ))}
      </dl>

      <h3 className="mb-2 text-sm text-muted-foreground">
        附近 {plan.screened} 家店，先划掉不合适的（{plan.rejected.length ? "部分" : "没有"}）
      </h3>
      {plan.rejected.length > 0 && (
        <ul className="mb-5 space-y-2 rounded-md border bg-card px-3 py-3">
          {plan.rejected.map(r => (
            <li key={r.name} className="text-sm">
              <span className="font-hand text-base line-through decoration-veto decoration-2">{r.name}</span>
              <span className="block font-hand text-veto">
                {r.violations.map(v => `${v.who}（${v.rule}）${v.reason}`).join("；")}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-2 text-sm text-muted-foreground">剩下可以去的</h3>
      {plan.picks.length === 0 ? (
        <p className="rounded-md bg-card px-3 py-3 text-sm">附近没有同时满足所有人的店。可以放宽某个人的预算，或换一个出发地再试。</p>
      ) : (
        <ul className="space-y-3">
          {plan.picks.map(v => (
            <li key={v.id} className={`rounded-md border bg-card p-3 ${chosen?.id === v.id ? "border-primary ring-1 ring-primary" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-hand text-xl">{v.name}</p>
                <p className="shrink-0 font-mono text-sm tabular-nums">
                  {v.cost !== null ? `人均 ${yuan(v.cost)}` : "价格未知"}
                  {v.rating !== null && ` · ${v.rating} 分`}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{v.address}</p>
              <p className="mt-2 inline-block rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{v.note}</p>
              <button onClick={() => onChoose(v)} className="mt-2 block text-sm font-medium text-primary">
                {chosen?.id === v.id ? "已选这家，往下点菜" : "就去这家"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Step>
  );
}
