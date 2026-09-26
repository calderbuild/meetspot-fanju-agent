import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Copy, Loader2, RotateCw, Satellite } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { runProbe, type ProbeResult } from "@/services/probeService";

export const Route = createFileRoute("/")({
  component: Index,
});

const PROBE_URL = "https://restapi.amap.com/v3/ip?key=test";

type ProbeState =
  | { phase: "idle" }
  | { phase: "running" }
  | { phase: "done"; result: ProbeResult }
  | { phase: "error"; message: string };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "云函数调用失败，请稍后重试。";
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={label}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "已复制" : "复制"}
    </button>
  );
}

function Metric({
  index,
  label,
  value,
  emphasis = false,
}: {
  index: string;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">{index}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p
        className={
          emphasis
            ? "mt-2 font-mono text-4xl leading-none font-semibold tracking-tight text-foreground tabular-nums"
            : "mt-2 font-mono text-sm break-all text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

function ResultPanel({ result }: { result: ProbeResult }) {
  const statusText = result.httpStatus === null ? "无响应" : String(result.httpStatus);
  const statusHint =
    result.httpStatus === null
      ? "请求未拿到响应"
      : result.httpStatus >= 200 && result.httpStatus < 300
        ? "请求成功"
        : "已拿到响应，非 2xx";

  return (
    <section className="mt-10" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-foreground pt-4">
        <h2 className="text-sm font-semibold text-foreground">探测结果</h2>
        <span className="font-mono text-xs text-muted-foreground">{result.executedAt}</span>
      </div>

      <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-3">
        <Metric index="01" label="HTTP 状态码" value={statusText} emphasis />
        <Metric
          index="02"
          label="运行时版本"
          value={`${result.runtime.version} · ${result.runtime.platform}/${result.runtime.arch}`}
        />
        <Metric
          index="03"
          label="响应片段长度"
          value={`${result.snippet.length} / 200 字符`}
        />
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">
            04 · 响应前 200 个字符
          </span>
          {result.snippet ? (
            <CopyButton value={result.snippet} label="复制响应片段" />
          ) : null}
        </div>
        <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all text-foreground">
          {result.snippet || "（响应体为空）"}
        </pre>
      </div>

      <dl className="mt-8 grid gap-x-10 gap-y-3 border-t border-border pt-4 text-xs sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">请求地址</dt>
          <dd className="font-mono break-all text-foreground">{result.requestUrl}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">状态说明</dt>
          <dd className="text-foreground">{statusHint}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">云函数执行</dt>
          <dd className="text-foreground">{result.success ? "成功返回" : "请求异常，已记录"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">本次记录</dt>
          <dd className="font-mono break-all text-foreground">
            {result.recordId ?? result.recordError ?? "未写入"}
          </dd>
        </div>
      </dl>

      {result.error ? (
        <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="break-all">云函数内错误信息：{result.error}</span>
        </p>
      ) : null}
    </section>
  );
}

function Index() {
  const [state, setState] = useState<ProbeState>({ phase: "idle" });

  async function handleProbe() {
    setState({ phase: "running" });
    try {
      const result = await runProbe();
      setState({ phase: "done", result });
    } catch (error) {
      setState({ phase: "error", message: getErrorMessage(error) });
    }
  }

  const running = state.phase === "running";
  const hasResult = state.phase === "done";

  return (
    <main className="min-h-screen bg-background px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          <span className="text-foreground">QMuse 云函数</span>
          <span aria-hidden="true">/</span>
          <span>能力探测 probe</span>
          <span aria-hidden="true">/</span>
          <span>node-22</span>
        </header>

        <h1 className="mt-8 text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl">
          一次点击，验证云函数出网能力
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          页面只做一件事：调用云函数 probe，由它在服务端 fetch 下面的地址，并把 HTTP
          状态码、响应前 200 个字符和运行时版本原样带回。用于确认云函数能正常发起外部请求。
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <code className="rounded-md border border-border bg-muted/40 px-3 py-1.5 font-mono text-xs break-all text-foreground">
            GET {PROBE_URL}
          </code>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button size="lg" onClick={handleProbe} disabled={running}>
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : hasResult ? (
              <RotateCw className="size-4" />
            ) : (
              <Satellite className="size-4" />
            )}
            {running ? "探测中…" : hasResult ? "重新探测" : "调用云函数 probe"}
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {state.phase === "idle"
              ? "尚未执行"
              : running
                ? "等待云函数返回"
                : hasResult
                  ? "已完成一次探测"
                  : "调用失败"}
          </span>
        </div>

        {state.phase === "error" ? (
          <div
            className="mt-10 flex items-start gap-3 border-t-2 border-destructive/60 pt-4"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">云函数调用失败</p>
              <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
                {state.message}
              </p>
            </div>
          </div>
        ) : null}

        {state.phase === "done" ? <ResultPanel result={state.result} /> : null}
      </div>
    </main>
  );
}