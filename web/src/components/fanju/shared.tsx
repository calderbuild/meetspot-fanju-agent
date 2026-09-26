import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="mb-3 flex items-baseline gap-2 text-lg font-semibold">
        <span className="font-mono text-sm text-muted-foreground">{n}/3</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

// Honest progress: says what the service is doing and how long it has taken, no fake percentages.
export function Working({ what }: { what: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p role="status" className="flex items-center gap-2 rounded-md bg-card px-3 py-3 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {what}
      <span className="ml-auto font-mono tabular-nums">{seconds} 秒</span>
    </p>
  );
}

export function Failed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-md border border-veto/40 bg-card px-3 py-3 text-sm">
      <p className="text-veto">{message}</p>
      <button onClick={onRetry} className="mt-2 font-medium text-primary underline underline-offset-4">
        再试一次
      </button>
    </div>
  );
}

export function errorText(e: unknown) {
  return e instanceof Error && e.message ? e.message : "出了点问题，请再试一次";
}

export const yuan = (n: number) => `¥${Number.isInteger(n) ? n : n.toFixed(1)}`;
