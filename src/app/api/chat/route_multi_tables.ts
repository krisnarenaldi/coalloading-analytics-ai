import { createClient } from "@/utils/supabase/server";
import {
  streamText,
  tool,
  jsonSchema,
  convertToModelMessages,
  stepCountIs,
} from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { RETAIL_TOOLS } from "@/lib/tools";

// Required for Edge/Node streaming depending on your setup
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  // x. setting prompot
  const today = new Date().toISOString().slice(0, 10); // format: YYYY-MM-DD
  // Tanggal hari ini adalah ${today}.
  const systemPrompt = `
      You are an AI that converts user queries into SQL function calls.
      Available functions: ${JSON.stringify(RETAIL_TOOLS, null, 2)}

      Rules:
      - Always choose the most relevant function
      - Extract parameters from user query
      - If not mentioned → set to null      

      If a user asks something outside the scope of analytics (e.g. weather, capitals, etc.), reply: "Sorry, I can only help with data supply chain."`;
  // a. Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // // user tidak login/ada session
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();

  // b. Cek limit usage

  // // 1. Check Usage Config Limit
  const maxChats = parseInt(process.env.MAX_CHATS_PER_USER || "5", 10);

  // // 2. Query Usage from Supabase (count rows in usage_logs) — hanya hari ini
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error: usageError } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayStart.toISOString());

  const currentChatCount = count || 0;

  if (currentChatCount >= maxChats) {
    return new Response(
      `You have reached your limit of ${maxChats} conversations. Please upgrade your account or contact support.`,
      { status: 403 },
    );
  }

  // 3. Initialize AI SDK Anthropics instance with specific API key handling if needed
  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // 4. Record the Usage (Insert into usage_logs)
  const { error: insertError } = await supabase
    .from("usage_logs")
    .insert({ user_id: user.id });

  if (insertError) {
    console.error("Failed to insert usage log", insertError);
    // Log the error but continue
  }

  // 5. Build tools dari RETAIL_TOOLS + executeTool (agentic loop)
  const maxTokens = parseInt(process.env.MAX_OUTPUT_TOKENS || "700", 10);

  const agentTools = Object.fromEntries(
    RETAIL_TOOLS.map((t) => [
      t.name,
      tool({
        description: t.description,
        inputSchema: jsonSchema(t.input_schema as any),
        execute: async (input: any) => executeTool(t.name, input, supabase),
      }),
    ]),
  );

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: agentTools,
    stopWhen: stepCountIs(5),
    maxOutputTokens: maxTokens,
  });

  // 6. Return UI Message Stream Response
  return result.toUIMessageStreamResponse();
}

async function executeTool(
  name: String,
  input: any,
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  console.log(`[tool] ${name}`, JSON.stringify(input));
  if (name === "get_schema") {
    return {
      tables: ["fob_scheme", "trans_scheme", "cif_scheme"],
      supply_chain_columns: [
        "skema",
        "pltu",
        "no_jadwal",
        "no_pengiriman",
        "pemasok",
      ],
    };
  }

  if (name === "get_end_to_end_shipments") {
    const { start_date, end_date, kapal, pemasok } = input;
    const { data, error } = await supabase.rpc("get_end_to_end_shipments", {
      p_start_date: start_date,
      p_end_date: end_date,
      p_kapal: kapal,
      p_pemasok: pemasok,
    });
    if (error) {
      console.error("[get_end_to_end_shipments] Supabase error:", error);
      throw new Error(error.message);
    }
    return data;
  }

  if (name === "get_vessel_performance") {
    const { start_date, end_date, kapal } = input;

    const { data, error } = await supabase.rpc("get_vessel_performance", {
      p_start_date: start_date,
      p_end_date: end_date,
      p_kapal: kapal,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  if (name === "get_volume_loss") {
    const { start_date, end_date, threshold } = input;

    const { data, error } = await supabase.rpc("get_volume_loss", {
      p_start_date: start_date,
      p_end_date: end_date,
      p_threshold: threshold,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  if (name === "get_bottleneck_analysis") {
    const { start_date, end_date } = input;

    const { data, error } = await supabase.rpc("get_bottleneck_analysis", {
      p_start_date: start_date,
      p_end_date: end_date,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  if (name === "get_pricing_integrity") {
    const { start_date, end_date, min_gcv } = input;

    const { data, error } = await supabase.rpc("get_pricing_integrity", {
      p_start_date: start_date,
      p_end_date: end_date,
      p_min_gcv: min_gcv,
    });

    if (error) throw new Error(error.message);
    return data;
  }
}
