import { createQmuseRow, executeQmuseFunction } from "./appwrite";

export interface PersonInput {
  who: string;
  from: string;
  text: string;
}

export interface Constraint {
  who: string;
  raw: string;
  vegetarian: boolean;
  avoid_seafood: boolean;
  allergens: string[];
  budget_max: number | null;
  spicy: "like" | "avoid" | "any";
  cuisines_like: string[];
}

export interface Violation {
  who: string;
  rule: string;
  reason: string;
}

export interface Venue {
  id: string;
  name: string;
  type: string;
  tag: string;
  address: string;
  rating: number | null;
  cost: number | null;
  note: string;
}

export interface VenuePlan {
  constraints: Constraint[];
  rejected: { name: string; violations: Violation[] }[];
  screened: number;
  picks: Venue[];
}

export interface Dish {
  name: string;
  price: number | null;
}

export interface OrderPlan {
  dishes: { name: string; qty: number; price: number; why: string }[];
  ok: boolean;
  problems: string[];
  warnings: string[];
  total: number;
  perPerson: number;
  retried: boolean;
  disclaimer: string;
}

async function callFanju<T>(body: Record<string, unknown>): Promise<T> {
  const execution = await executeQmuseFunction({ functionId: "fanju", body: JSON.stringify(body) });
  if (execution.status !== "completed") {
    throw new Error(execution.errors?.trim() || `服务没有完成（${execution.status}），请重试`);
  }
  const parsed = JSON.parse(execution.responseBody || "{}") as { success?: boolean; data?: T; message?: string };
  if (!parsed.success || !parsed.data) throw new Error(parsed.message || "服务返回为空，请重试");
  return parsed.data;
}

export const planVenue = (city: string, people: PersonInput[]) =>
  callFanju<VenuePlan>({ action: "plan-venue", city, people });

export const readMenu = (image: string) => callFanju<{ dishes: Dish[] }>({ action: "read-menu", image });

export const planOrder = (menu: Dish[], people: Constraint[]) =>
  callFanju<OrderPlan>({ action: "plan-order", menu, people });

// A type alias (not an interface) so it satisfies the row data index signature.
export type FeedbackInput = {
  rating: number;
  stage: "venue" | "order";
  headcount: number;
  venue_name?: string;
  comment?: string;
};

export const saveFeedback = (data: FeedbackInput) => createQmuseRow({ tableId: "dinner_feedback", data });
