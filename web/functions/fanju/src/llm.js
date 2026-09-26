// Bailian OpenAI-compatible endpoint on the workspace domain; the shared
// dashscope.aliyuncs.com domain goes into maintenance mode on 2026-09-30.
// qwen3.7-flash is a native vision-language model, so it reads menus too.
const URL = 'https://llm-wactc2juuddfp1aa.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = 'qwen3.7-flash';

export async function chatJson(messages) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: 'json_object' },
      enable_thinking: false,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(40000),
  });
  if (!r.ok) throw new Error(`模型接口 HTTP ${r.status}`);
  const d = await r.json();
  return JSON.parse(d.choices[0].message.content);
}
