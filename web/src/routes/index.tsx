import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/fanju/Feedback";
import { OrderStep } from "@/components/fanju/OrderStep";
import { PeopleStep, SAMPLE_PEOPLE, emptyPerson } from "@/components/fanju/PeopleStep";
import { Failed, Working, errorText } from "@/components/fanju/shared";
import { VenueStep } from "@/components/fanju/VenueStep";
import { planVenue, type OrderPlan, type PersonInput, type Venue, type VenuePlan } from "@/services/fanjuService";

export const Route = createFileRoute("/")({
  component: Index,
});

type VenueState = { k: "idle" } | { k: "working" } | { k: "done"; plan: VenuePlan } | { k: "error"; msg: string };

function Index() {
  const [city, setCity] = useState("北京");
  const [people, setPeople] = useState<PersonInput[]>([emptyPerson(0), emptyPerson(1)]);
  const [venue, setVenue] = useState<VenueState>({ k: "idle" });
  const [chosen, setChosen] = useState<Venue | null>(null);
  const [order, setOrder] = useState<OrderPlan | null>(null);
  const step2 = useRef<HTMLDivElement>(null);
  const step3 = useRef<HTMLDivElement>(null);

  async function findVenue(forPeople = people, forCity = city) {
    setVenue({ k: "working" });
    setChosen(null);
    setOrder(null);
    requestAnimationFrame(() => step2.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    try {
      setVenue({ k: "done", plan: await planVenue(forCity, forPeople) });
    } catch (e) {
      setVenue({ k: "error", msg: errorText(e) });
    }
  }

  function trySample() {
    setCity("北京");
    setPeople(SAMPLE_PEOPLE);
    findVenue(SAMPLE_PEOPLE, "北京");
  }

  function choose(v: Venue) {
    setChosen(v);
    setOrder(null);
    requestAnimationFrame(() => step3.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const plan = venue.k === "done" ? venue.plan : null;

  return (
    <main className="mx-auto max-w-lg space-y-8 px-4 pb-16 pt-8">
      <header>
        <p className="text-xs tracking-widest text-muted-foreground">MeetSpot 饭局</p>
        <h1 className="mt-2 font-hand text-3xl leading-snug">
          几个人吃饭，<br />去哪、点什么，一次谈拢
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          每人说一句要求。先把不合适的店划掉，到了店里拍一下菜单，再出一张大家都能吃的点菜单。
        </p>
        <Button className="mt-4" onClick={trySample} disabled={venue.k === "working"}>
          用示例饭局试一下（4 人）
        </Button>
      </header>

      <PeopleStep city={city} people={people} busy={venue.k === "working"} onCity={setCity} onPeople={setPeople} onSubmit={() => findVenue()} />

      <div ref={step2} className="scroll-mt-4">
        {venue.k === "working" && <Working what="正在整理每个人的要求、找大家的中间位置、筛附近的店" />}
        {venue.k === "error" && <Failed message={venue.msg} onRetry={() => findVenue()} />}
        {plan && <VenueStep plan={plan} chosen={chosen} onChoose={choose} />}
      </div>

      <div ref={step3} className="scroll-mt-4">
        {plan && chosen && <OrderStep venue={chosen} people={plan.constraints} order={order} onOrder={setOrder} />}
      </div>

      {plan && (
        <Feedback base={{ stage: order ? "order" : "venue", headcount: plan.constraints.length, venue_name: chosen?.name }} />
      )}

      <footer className="text-xs leading-relaxed text-muted-foreground">
        餐厅数据来自高德地图，按店名、品类和招牌菜做初步排除，没有到店核实。菜名和价格以你拍的菜单为准。
        过敏和忌口请和店员当面确认。
      </footer>
    </main>
  );
}
