import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PersonInput } from "@/services/fanjuService";

import { Step } from "./shared";

export const SAMPLE_PEOPLE: PersonInput[] = [
  { who: "小王", from: "五道口地铁站", text: "人均别超过 80，最近手头紧" },
  { who: "小李", from: "国贸地铁站", text: "我不吃海鲜，别的都行" },
  { who: "小张", from: "望京SOHO", text: "我吃素" },
  { who: "小陈", from: "西直门地铁站", text: "花生过敏，想吃点辣的" },
];

export const emptyPerson = (i: number): PersonInput => ({ who: `朋友${i + 1}`, from: "", text: "" });

interface Props {
  city: string;
  people: PersonInput[];
  busy: boolean;
  onCity: (city: string) => void;
  onPeople: (people: PersonInput[]) => void;
  onSubmit: () => void;
}

export function PeopleStep({ city, people, busy, onCity, onPeople, onSubmit }: Props) {
  const set = (i: number, patch: Partial<PersonInput>) =>
    onPeople(people.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const ready = people.length >= 2 && people.every(p => p.who.trim() && p.from.trim() && p.text.trim()) && city.trim();

  return (
    <Step n={1} title="谁来吃">
      <label className="mb-3 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">城市</span>
        <Input value={city} onChange={e => onCity(e.target.value)} className="h-9 w-28 bg-card" />
      </label>
      <ul className="space-y-3">
        {people.map((p, i) => (
          <li key={i} className="rounded-md border bg-card p-3">
            <div className="flex gap-2">
              <Input aria-label="称呼" value={p.who} onChange={e => set(i, { who: e.target.value })} className="h-9 w-24" />
              <Input aria-label="从哪出发" placeholder="从哪出发，如 国贸地铁站" value={p.from} onChange={e => set(i, { from: e.target.value })} className="h-9 flex-1" />
              {people.length > 2 && (
                <button aria-label={`移除${p.who}`} onClick={() => onPeople(people.filter((_, j) => j !== i))} className="px-1 text-muted-foreground">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Textarea
              aria-label={`${p.who}的要求`}
              placeholder="一句话说要求，如：我吃素，人均别超过 100"
              value={p.text}
              onChange={e => set(i, { text: e.target.value })}
              rows={2}
              className="mt-2 resize-none font-hand text-base"
            />
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between">
        {people.length < 8 ? (
          <button onClick={() => onPeople([...people, emptyPerson(people.length)])} className="flex items-center gap-1 text-sm text-primary">
            <Plus className="size-4" /> 再加一个人
          </button>
        ) : <span />}
        <Button onClick={onSubmit} disabled={!ready || busy}>找餐厅</Button>
      </div>
    </Step>
  );
}
