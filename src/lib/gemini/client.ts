import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-2.5-flash";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  jsonMode?: boolean;
}

export async function generateWithGemini(options: GenerateOptions): Promise<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
    systemInstruction: options.systemPrompt,
  });

  const result = await model.generateContent(options.userPrompt);
  const text = result.response.text();
  return text;
}

export async function generateJSON<T>(options: GenerateOptions): Promise<T> {
  const text = await generateWithGemini({ ...options, jsonMode: true });
  return JSON.parse(text) as T;
}

export { MODEL };
