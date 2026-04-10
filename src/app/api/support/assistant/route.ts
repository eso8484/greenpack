import { NextResponse } from "next/server";
import { z } from "zod";

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
    "Style: concise, practical, human, no fluff.",
    "Rules:",
    "- Do not pretend a live agent has replied.",
    "- If mode is queue/live-agent, do not answer as agent; only acknowledge waiting status.",
    "- If user asks for human, set suggestEscalation true.",
    "- Mention order refs only if supplied in context.",
    "Output strictly JSON: {\"reply\": string, \"suggestEscalation\": boolean}",
  ].join("\n");
}

async function runAi(requestBody: z.infer<typeof SupportAssistantRequestSchema>): Promise<AiResponse> {
  const apiKey = process.env.SUPPORT_AI_API_KEY;
  const model = process.env.SUPPORT_AI_MODEL ?? "gpt-4o-mini";
  const baseUrl = process.env.SUPPORT_AI_BASE_URL ?? "https://api.openai.com/v1";

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

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
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

  const parsed = JSON.parse(content) as AiResponse;
  const reply = String(parsed.reply ?? "").trim();

  if (!reply) {
    throw new Error("AI provider returned invalid reply payload");
  }

  return {
    reply,
    suggestEscalation: Boolean(parsed.suggestEscalation),
  };
}

export async function POST(request: Request) {
  try {
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
