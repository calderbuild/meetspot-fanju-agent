import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveFeedback, type FeedbackInput } from "@/services/fanjuService";

import { errorText } from "./shared";

export function Feedback({ base }: { base: Omit<FeedbackInput, "rating" | "comment"> }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | string>("idle");

  async function submit() {
    setState("saving");
    try {
      await saveFeedback({ ...base, rating, comment: comment.trim() || undefined });
      setState("saved");
    } catch (e) {
      setState(errorText(e));
    }
  }

  if (state === "saved") return <p className="text-sm text-muted-foreground">反馈已提交，谢谢。</p>;

  return (
    <section className="rounded-md border bg-card p-3">
      <h2 className="text-sm font-medium">这次帮上忙了吗？</h2>
      <div className="mt-2 flex gap-2" role="radiogroup" aria-label="有用程度">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            role="radio"
            aria-checked={rating === n}
            onClick={() => setRating(n)}
            className={`size-9 rounded-md border font-mono ${rating === n ? "border-primary bg-primary text-primary-foreground" : ""}`}
          >
            {n}
          </button>
        ))}
        <span className="self-center text-xs text-muted-foreground">1 没用，5 很有用</span>
      </div>
      <Textarea
        value={comment}
        onChange={e => setComment(e.target.value.slice(0, 500))}
        placeholder="哪里好用、哪里不对，一句话就行（会公开可见，请不要写个人信息）"
        rows={2}
        className="mt-2 resize-none"
      />
      {state !== "idle" && state !== "saving" && <p className="mt-2 text-sm text-veto">{state}</p>}
      <Button className="mt-2" onClick={submit} disabled={!rating || state === "saving"}>提交反馈</Button>
    </section>
  );
}
