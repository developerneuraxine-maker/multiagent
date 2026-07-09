export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  jsonMode?: boolean;
}

async function callOpenAI(options: GenerateOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured. Add it to your .env file.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: options.temperature ?? 0.7,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userPrompt },
      ],
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty response");
  return content;
}

export async function generateWithGemini(options: GenerateOptions): Promise<string> {
  return callOpenAI(options);
}

export async function generateJSON<T>(options: GenerateOptions): Promise<T> {
  const text = await callOpenAI({ ...options, jsonMode: true });
  return JSON.parse(text) as T;
}

export const MODEL = "gpt-4o-mini";
