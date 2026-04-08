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
      tables: {
        fob_scheme: [
          "id",
          "skema",
          "pltu",
          "no_jadwal",
          "no_pengiriman",
          "pemasok",
          "no_kontrak",
          "kapal_tongkang",
          "bulan_conf",
          "tahun_conf",
          "volume_bl",
          "tanggal_bl",
          "volume_ds",
          "tanggal_tiba",
          "tanggal_sandar_muat",
          "tanggal_muat",
          "tanggal_selesai_muat",
          "pelabuhan_muat",
          "moda",
          "svy_loading",
          "sert_loading",
          "tanggal_coa_loading",
          "ld_gcv",
          "ld_tm",
          "ld_ts",
          "ld_ash",
          "ld_hgi",
          "ld_aft",
          "ld_ayk_238",
          "ld_ayk_70",
          "svy_unloading",
          "sert_unloading",
          "tanggal_coa_unloading",
          "ul_gcv",
          "ul_tm",
          "ul_ts",
          "ul_ash",
          "ul_hgi",
          "ul_aft",
          "ul_ayk_238",
          "ul_ayk_70",
          "harga_dasar_fob",
          "harga_dasar_trans",
          "mfo_base",
          "p1_hsd_trans",
          "harga_dasar_trans_bulan",
          "harga_cif",
          "harga_penyesuaian",
          "denda_penolakan",
          "harga_bb_mjd",
          "fob_dpp",
          "fob_ppn",
          "denda_muat",
          "total_tagihan",
        ],
        trans_scheme: [
          "id",
          "skema",
          "pltu",
          "no_jadwal",
          "no_pengiriman",
          "pemasok",
          "no_kontrak",
          "kapal_tongkang",
          "tanggal_ta_rakor",
          "volume_rakor",
          "volume_bl",
          "tanggal_bl",
          "volume_ds",
          "tanggal_realisasi",
          "tanggal_sandar_jetty",
          "time_bongkar",
          "time_selesai",
          "tanggal_bast",
          "port_of_loading",
          "moda",
          "sert_loading",
          "tanggal_coa_loading",
          "ld_gcv",
          "ld_tm",
          "ld_ts",
          "ld_ash",
          "ld_hgi",
          "ld_idt",
          "ld_sodium",
          "ld_nitrogen",
          "ld_slagging",
          "ld_fouling",
          "ld_ayk_238",
          "ld_ayk_32",
          "ld_ayk_50",
          "ld_ayk_70",
          "sert_unloading",
          "tanggal_coa",
          "ul_gcv",
          "ul_tm",
          "ul_ts",
          "ul_ash",
          "ul_hgi",
          "ul_sodium",
          "ul_nitrogen",
          "ul_slagging",
          "ul_fouling",
          "ul_ayk_238",
          "ul_ayk_238",
          "ul_ayk_32",
          "ul_ayk_50",
          "ul_ayk_70",
          "tarif_sewa",
          "varx",
          "vary",
          "faktor_y2",
          "harga_hsdm",
          "p1_hsd_trans",
          "harga_htn_trans",
          "harga_pbm",
          "mfo_base",
          "p2_mfo",
          "pajak_dpp",
          "pajak_ppn",
          "denda_susut",
          "total_tagihan_trans",
        ],
        cif_scheme: [
          // ✏️ Replace with actual columns from your cif_scheme table
          "FILL_IN_YOUR_CIF_COLUMNS_HERE",

          "id",
          "skema",
          "pltu",
          "no_jadwal",
          "no_pengiriman",
          "pemasok",
          "no_kontrak",
          "kapal_tongkang",
          "tanggal_ta_rakor",
          "volume_rakor",
          "volume_bl",
          "tanggal_bl",
          "volume_ds",
          "tanggal_realisasi",
          "tanggal_sandar",
          "time_bongkar",
          "time_selesai",
          "port_of_loading",
          "moda",
          "svy_loading",
          "sert_loading",
          "tanggal_coa_loading",
          "ld_gcv",
          "ld_tm",
          "ld_ts",
          "ld_ash",
          "ld_hgi",
          "ld_idt",
          "ld_sodium",
          "ld_nitrogen",
          "ld_slagging",
          "ld_fouling",
          "ld_ayk_238",
          "ld_ayk_32",
          "ld_ayk_50",
          "ld_ayk_70",
          "svy_unloading",
          "sert_unloading",
          "tanggal_coa",
          "ul_gcv",
          "ul_tm",
          "ul_ts",
          "ul_ash",
          "ul_hgi",
          "ul_aft",
          "ul_sodium",
          "ul_nitrogen",
          "ul_slagging",
          "ul_fouling",
          "ul_ayk_238",
          "ul_ayk_238",
          "ul_ayk_32",
          "ul_ayk_50",
          "ul_ayk_70",
          "harga_dasar_fob",
          "harga_dasar_trans",
          "p2_mfo",
          "harga_bbm",
          "harga_dasar_trans_bln",
          "harga_cif",
          "harga_penyesuaian",
          "denda_penolakan",
          "harga_bb_mjd",
          "harga_dpp",
          "harga_ppn",
          "denda_terlambat",
          "total_tagihan",
          "total_tagihan_trans",
          "status_shipment",
        ],
      },
    };
  }

  if (name === "fob_summary") {
    const { start_date, end_date } = input;
    const { data, error } = await supabase.rpc("fob_summary", {
      p_start_date: start_date,
      p_end_date: end_date,
    });
    if (error) {
      console.error("[fob_summary] Supabase error:", error);
      throw new Error(error.message);
    }
    return data;
  }

  if (name === "cif_summary") {
    const { start_date, end_date } = input;

    const { data, error } = await supabase.rpc("cif_summary", {
      p_start_date: start_date,
      p_end_date: end_date,
    });

    if (error) throw new Error(error.message);
    return data;
  }

  if (name === "trans_summary") {
    const { start_date, end_date } = input;

    const { data, error } = await supabase.rpc("trans_summary", {
      p_start_date: start_date,
      p_end_date: end_date,
    });

    if (error) throw new Error(error.message);
    return data;
  }
}
