import { Camera, Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImage } from "@/lib/compressImage";
import { planOrder, readMenu, type Constraint, type Dish, type OrderPlan, type Venue } from "@/services/fanjuService";

import { Failed, Step, Working, errorText, yuan } from "./shared";

// The published site serves the page and its static files from different hosts, so a page-relative path misses.
// public/ files sit one level above the built chunk in assets/. ponytail: assumes the built layout; the dev server is not used here.
const SAMPLE_MENU = import.meta.url.replace(/assets\/[^/]+$/, "sample-menu.jpg");

type Phase ={ k: "idle" } | { k: "reading" } | { k: "planning" } | { k: "error"; msg: string; retry: () => void };

export function OrderStep({ venue, people, order, onOrder }: {
  venue: Venue;
  people: Constraint[];
  order: OrderPlan | null;
  onOrder: (o: OrderPlan | null) => void;
}) {
  const [menu, setMenu] = useState<Dish[]>([]);
  const [phase, setPhase] = useState<Phase>({ k: "idle" });
  const [sample, setSample] = useState(false);

  async function read(file: Blob) {
    setPhase({ k: "reading" });
    onOrder(null);
    try {
      const { dishes } = await readMenu(await compressImage(file));
      setMenu(dishes);
      setPhase({ k: "idle" });
    } catch (e) {
      setPhase({ k: "error", msg: errorText(e), retry: () => read(file) });
    }
  }

  async function loadSample() {
    setSample(true);
    const r = await fetch(SAMPLE_MENU);
    if (!r.ok) return setPhase({ k: "error", msg: "示例菜单没加载出来，请刷新后再试", retry: loadSample });
    read(await r.blob());
  }

  async function plan() {
    setPhase({ k: "planning" });
    try {
      onOrder(await planOrder(menu, people));
      setPhase({ k: "idle" });
    } catch (e) {
      setPhase({ k: "error", msg: errorText(e), retry: plan });
    }
  }

  const set = (i: number, patch: Partial<Dish>) => setMenu(menu.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const priced = menu.filter(d => d.name.trim() && d.price !== null && d.price > 0).length;
  const busy = phase.k === "reading" || phase.k === "planning";

  return (
    <Step n={3} title="点什么">
      <p className="mb-3 text-sm text-muted-foreground">
        到了 <span className="font-hand text-base text-foreground">{venue.name}</span>，拍一下桌上的菜单。只从菜单上真有的菜里挑。
      </p>
      <div className="flex gap-2">
        <label className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground ${busy ? "pointer-events-none opacity-50" : ""}`}>
          <Camera className="size-4" /> {menu.length ? "重拍菜单" : "拍菜单"}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={e => { if (e.target.files?.[0]) { setSample(false); read(e.target.files[0]); } }} />
        </label>
        {menu.length === 0 && (
          <Button variant="outline" onClick={() => setMenu([{ name: "", price: null }])} disabled={busy}>手动输入菜</Button>
        )}
      </div>
      {!busy && (
        <button onClick={loadSample} className="mt-2 text-sm text-primary underline underline-offset-4">没在店里？用一张示例菜单试试</button>
      )}
      {sample && (
        <figure className="mt-3">
          <img src={SAMPLE_MENU} alt="示例菜单照片" className="max-h-64 rounded-sm border" />
          <figcaption className="mt-1 text-xs text-muted-foreground">
            示例菜单：广州莲香楼的真实菜单照片，不是上面这家店的。摄影 MeiOLA 2290 WMENSZ，CC0，来自 Wikimedia Commons。
          </figcaption>
        </figure>
      )}

      {phase.k === "reading" && <div className="mt-3"><Working what="正在读菜单上的菜名和价格" /></div>}

      {menu.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm text-muted-foreground">菜单（读错的地方直接改）</h3>
          <ul className="divide-y rounded-md border bg-card">
            {menu.map((d, i) => (
              <li key={i} className="flex items-center gap-2 px-2 py-1.5">
                <Input aria-label="菜名" value={d.name} onChange={e => set(i, { name: e.target.value })} className="h-8 flex-1 border-0 font-hand text-base shadow-none" />
                <Input
                  aria-label={`${d.name}价格`}
                  inputMode="decimal"
                  placeholder="价格"
                  value={d.price ?? ""}
                  onChange={e => set(i, { price: e.target.value === "" ? null : Number(e.target.value) })}
                  className={`h-8 w-20 text-right font-mono tabular-nums ${d.price === null ? "border-veto" : ""}`}
                />
                <button aria-label={`删掉${d.name}`} onClick={() => setMenu(menu.filter((_, j) => j !== i))} className="text-muted-foreground">
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => setMenu([...menu, { name: "", price: null }])} className="flex items-center gap-1 text-sm text-primary">
              <Plus className="size-4" /> 加一道
            </button>
            <Button onClick={plan} disabled={busy || priced < 3}>出点菜单</Button>
          </div>
          {priced < 3 && <p className="mt-2 text-xs text-muted-foreground">至少要有 3 道带价格的菜，红框是还没价格的。</p>}
        </div>
      )}

      {phase.k === "planning" && <div className="mt-3"><Working what="正在按每个人的要求挑菜并核对" /></div>}
      {phase.k === "error" && <div className="mt-3"><Failed message={phase.msg} onRetry={phase.retry} /></div>}
      {order && <OrderSlip order={order} venue={venue} headcount={people.length} />}
    </Step>
  );
}

// The signature element: a handwritten order slip like the ones waiters tear off a pad.
function OrderSlip({ order, venue, headcount }: { order: OrderPlan; venue: Venue; headcount: number }) {
  return (
    <figure className="mx-auto mt-5 max-w-sm animate-in fade-in duration-300 rounded-sm bg-card px-4 pb-4 pt-3 shadow-[0_1px_0_var(--color-border),0_8px_24px_-12px_oklch(0.26_0.045_266/0.35)]">
      <figcaption className="flex items-baseline justify-between border-b-2 border-slip-rule pb-2">
        <span className="text-xs tracking-widest text-veto">点菜单</span>
        <span className="font-hand text-base">{venue.name}</span>
        <span className="font-mono text-xs tabular-nums">{headcount} 位</span>
      </figcaption>
      <ol className="divide-y divide-dashed divide-slip-rule">
        {order.dishes.map((d, i) => (
          <li key={`${d.name}-${i}`} className="py-2">
            <div className="flex items-baseline gap-2">
              <span className="font-hand text-lg">{d.name}</span>
              {d.qty > 1 && <span className="font-mono text-xs">×{d.qty}</span>}
              <span className="ml-auto font-mono tabular-nums">{yuan(d.price * d.qty)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {d.fitsFor.length ? `按菜名看，${d.fitsFor.join("、")}能吃` : "按菜名看，不适合在座的人"}
            </p>
          </li>
        ))}
      </ol>
      <div className="flex items-baseline justify-between border-t-2 border-slip-rule pt-2">
        <span className="text-sm">合计</span>
        <span className="font-mono text-lg tabular-nums">{yuan(order.total)}</span>
      </div>
      <p className="text-right font-mono text-xs tabular-nums text-muted-foreground">人均 {yuan(order.perPerson)}（总价按菜单价格算出）</p>

      {!order.ok && (
        <div className="mt-3 text-sm text-veto">
          <p>这份单子还有没满足的地方：</p>
          <ul className="list-disc pl-5">{order.problems.map(p => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      {order.retried && order.ok && <p className="mt-2 text-xs text-muted-foreground">第一版有不合要求的地方，已自动改过一次。</p>}
      {order.warnings.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-veto">{order.warnings.map(w => <li key={w}>{w}</li>)}</ul>
      )}
      <p className="mt-3 rounded-sm bg-muted px-2 py-1.5 text-sm font-medium">{order.disclaimer}</p>
      <p className="mt-2 text-xs text-muted-foreground">菜的份数按“人数加一道”的经验估算。</p>
    </figure>
  );
}
