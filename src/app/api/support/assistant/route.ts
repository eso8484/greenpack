import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SupportAssistantRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  mode: z.enum(["assistant", "queue", "live-agent"]),
  selectedOrderId: z.string().uuid().nullable().optional(),
  orders: z
    .array(
      z.object({
        id: z.string(),
        status: z.string(),
        total_amount: z.number(),
        created_at: z.string(),
      })
    )
    .max(10)
    .optional(),
  history: z
    .array(
      z.object({
        sender: z.enum(["user", "assistant", "agent", "system"]),
        text: z.string().max(4000),
      })
    )
    .max(20)
    .optional(),
});

type AiResponse = {
  reply: string;
  suggestEscalation?: boolean;
};

function buildSystemPrompt() {
  return [
    "You are GreenPack Support Assistant for a Nigerian marketplace.",
    "Goal: solve user issue quickly before human handoff.",
    "Scope: customer support only (orders, delivery, payments, account access, vendor complaints, bug reports).",
    "Style: concise, practical, human, no fluff.",
    "Rules:",
    "- Never provide content outside support scope (no coding help, no random knowledge dumps).",
    "- Never invent order data, policy, timelines, or refunds not present in context.",
    "- Do not pretend a live agent has replied.",
    "- If mode is queue/live-agent, do not solve; only acknowledge queue status and request patience.",
    "- If user asks for human, set suggestEscalation true.",
    "- Mention order refs only if supplied in context.",
    "- Keep reply below 90 words unless user explicitly requests detailed steps.",
    "Output strictly JSON: {\"reply\": string, \"suggestEscalation\": boolean}",
  ].join("\n");
}

function parseAiResponse(content: string): AiResponse {
  let parsed: Partial<AiResponse> | null = null;

  try {
    parsed = JSON.parse(content) as Partial<AiResponse>;
  } catch {
    const fenced = content.match(/\{[\s\S]*\}/);
    if (fenced) {
      try {
        parsed = JSON.parse(fenced[0]) as Partial<AiResponse>;
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed) {
    return {
      reply: content.trim(),
      suggestEscalation: false,
    };
  }

  const reply = String(parsed.reply ?? "").trim();
  if (!reply) {
    throw new Error("AI provider returned invalid reply payload");
  }

  return {
    reply,
    suggestEscalation: Boolean(parsed.suggestEscalation),
  };
}

async function runAi(requestBody: z.infer<typeof SupportAssistantRequestSchema>): Promise<AiResponse> {
  const apiKey = process.env.SUPPORT_AI_API_KEY;
  const provider = (process.env.SUPPORT_AI_PROVIDER ?? "openrouter").toLowerCase();
  const model =
    process.env.SUPPORT_AI_MODEL ??
    (provider === "openrouter" ? "meta-llama/llama-3.1-8b-instruct:free" : "gpt-4o-mini");
  const baseUrl =
    process.env.SUPPORT_AI_BASE_URL ??
    (provider === "openrouter" ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1");
  const appUrl = process.env.SUPPORT_AI_APP_URL ?? "http://localhost:3000";
  const appName = process.env.SUPPORT_AI_APP_NAME ?? "GreenPack Support";

  if (!apiKey) {
    throw new Error("SUPPORT_AI_API_KEY is not configured");
  }

  const selectedOrder = requestBody.selectedOrderId
    ? requestBody.orders?.find((order) => order.id === requestBody.selectedOrderId) ?? null
    : null;

  const context = {
    mode: requestBody.mode,
    latestMessage: requestBody.message,
    selectedOrder,
    orders: requestBody.orders?.slice(0, 5) ?? [],
    history: requestBody.history?.slice(-10) ?? [],
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenRouter recommends attribution headers; harmless for OpenAI-compatible providers.
  headers["HTTP-Referer"] = appUrl;
  headers["X-Title"] = appName;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 220,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ],
    }),
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new Error(`AI provider failed (${response.status}): ${raw.slice(0, 180)}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI provider returned empty response");
  }

  return parseAiResponse(content);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = SupportAssistantRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = await runAi(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("POST /api/support/assistant", err);
    return NextResponse.json(
      { success: false, error: "AI assistant is currently unavailable" },
      { status: 503 }
    );
  }
}
