import Groq from "groq-sdk";
import { listProducts, getWarehouses, listPurchaseRequests } from "@/lib/db";
import {
  products as seedProducts,
  warehouses as seedWarehouses,
  purchaseRequests as seedPurchaseRequests,
} from "@/lib/mock-data";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "Invalid request: messages array is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return Response.json(
        {
          error:
            "GROQ_API_KEY is not configured on the server. Please add your Groq API key to your environment variables (.env.local or .env).",
        },
        { status: 503 }
      );
    }

    // Attempt to load live data through DB layer (which ensures schema initialization via ready()).
    // Fall back to seed mock data if database is unreachable or unconfigured.
    let productsList: Array<{
      name: string;
      sku?: string;
      stock?: number;
      status?: string;
      expiryDate?: string;
      warehouse?: string;
      category?: string;
    }> = [];
    let warehousesList: Array<{ id: string; name: string; location?: string }> = [];
    let pendingProcurement: Array<{ product?: string; quantity?: number; date?: string }> = [];

    try {
      const [dbProducts, dbWarehouses, dbRequests] = await Promise.all([
        listProducts(),
        getWarehouses(),
        listPurchaseRequests(),
      ]);
      productsList = dbProducts;
      warehousesList = dbWarehouses;
      pendingProcurement = dbRequests.filter(
        (r) => (r.status || "").toLowerCase() === "pending"
      );
    } catch (dbErr) {
      console.warn("Unable to fetch live database context for chat, falling back to seed data:", dbErr);
      productsList = seedProducts;
      warehousesList = seedWarehouses;
      pendingProcurement = seedPurchaseRequests.filter(
        (r) => (r.status || "").toLowerCase() === "pending"
      );
    }

    // Safely compute products expiring within 14 days
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const expiringSoon = productsList.filter((p) => {
      if (!p.expiryDate) return false;
      const d = new Date(p.expiryDate);
      return !isNaN(d.getTime()) && d >= now && d <= in14Days;
    });

    // Curate actionable items to stay comfortably within Groq's 8,000 TPM limit
    const outOfStock = productsList.filter((p) => p.status === "out" || (p.stock ?? 0) === 0);
    const lowStock = productsList.filter((p) => p.status === "low" && (p.stock ?? 0) > 0);
    const inStockSample = productsList
      .filter((p) => p.status !== "out" && p.status !== "low")
      .slice(0, 10);

    const formatLine = (p: (typeof productsList)[0]) =>
      `- ${p.name} (SKU:${p.sku ?? "N/A"}) | Qty:${p.stock ?? 0} | Status:${p.status ?? "in"} | Exp:${p.expiryDate ?? "N/A"} | WH:${p.warehouse ?? "Unassigned"}`;

    const context = `
You are Inventra AI, a knowledgeable and concise inventory intelligence assistant.
You have access to live inventory, warehouse, and purchase request data.

FORMATTING RULES FOR MAXIMUM READABILITY:
- Structure your response using clean, bite-sized paragraphs separated by blank lines.
- When listing items, products, or metrics, format them as clean bullet points with bold titles (e.g., "* **Product Name**: Details").
- When suggesting next steps or actions, use a numbered list (e.g., "1. Action step").
- Do NOT output dense, unbroken walls of text. Keep responses focused and readable.

CURRENT INVENTORY SUMMARY:
Total products in catalog: ${productsList.length}
Low stock items: ${lowStock.length}
Out of stock items: ${outOfStock.length}
Expiring soon: ${expiringSoon.length}

WAREHOUSES:
${warehousesList.map((w) => `- ${w.name}${w.location ? ` (${w.location})` : ""}`).join("\n")}

OUT OF STOCK (Top ${Math.min(outOfStock.length, 18)}):
${outOfStock.length === 0 ? "None" : outOfStock.slice(0, 18).map(formatLine).join("\n")}

LOW STOCK (Top ${Math.min(lowStock.length, 18)}):
${lowStock.length === 0 ? "None" : lowStock.slice(0, 18).map(formatLine).join("\n")}

EXPIRING SOON:
${
  expiringSoon.length === 0
    ? "None"
    : expiringSoon
        .slice(0, 12)
        .map((p) => `- ${p.name} | SKU: ${p.sku ?? "N/A"} | Expires: ${p.expiryDate} | Qty: ${p.stock ?? 0}`)
        .join("\n")
}

ACTIVE PRODUCTS SAMPLE:
${inStockSample.map(formatLine).join("\n")}

PENDING PURCHASE REQUESTS:
${
  pendingProcurement.length === 0
    ? "None"
    : pendingProcurement
        .slice(0, 8)
        .map((p) => `- ${p.product ?? "Unknown item"} | Qty requested: ${p.quantity ?? 0} | Date: ${p.date ?? "N/A"}`)
        .join("\n")
}
`.trim();

    // Window conversation history to the last 4 turns to avoid token buildup
    const sanitizedMessages: Array<{ role: "user" | "assistant"; content: string }> = messages
      .slice(-4)
      .map((m: any) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: typeof m.content === "string" ? m.content.slice(0, 600) : "",
      }));

    const groq = new Groq({ apiKey });

    // Deprecated models that Groq has decommissioned (never attempt these)
    const DEPRECATED_MODELS = new Set([
      "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
      "llama3-8b-8192",
      "llama3-70b-8192",
      "mixtral-8x7b-32768",
      "gemma-7b-it",
      "gemma2-9b-it",
    ]);

    // Query active models dynamically from Groq if possible
    let liveModelIds: string[] = [];
    try {
      const modelList = await groq.models.list();
      liveModelIds = (modelList.data || [])
        .map((m) => m.id)
        .filter(
          (id) =>
            !id.includes("whisper") &&
            !id.includes("guard") &&
            !id.includes("orpheus") &&
            !DEPRECATED_MODELS.has(id)
        );
    } catch (listErr) {
      console.warn("Could not query Groq models dynamically, using curated list:", listErr);
    }

    // Prioritize clean, fast chat models that do not leak internal scratchpad reasoning
    const preferredOrder = [
      "qwen/qwen3.8-27b",
      "allam-2-7b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ];

    const envModel = process.env.GROQ_MODEL?.trim();
    const candidateModels = Array.from(
      new Set(
        [
          "qwen/qwen3.8-27b",
          envModel && !DEPRECATED_MODELS.has(envModel) && !envModel.includes("gpt-oss")
            ? envModel
            : null,
          ...preferredOrder.filter((m) => liveModelIds.length === 0 || liveModelIds.includes(m)),
          envModel && !DEPRECATED_MODELS.has(envModel) ? envModel : null,
          ...liveModelIds,
          ...preferredOrder,
        ].filter((m): m is string => Boolean(m && !DEPRECATED_MODELS.has(m)))
      )
    );

    let lastError: unknown = null;
    let completionText: string | null = null;

    // Use max_tokens: 800 to keep (prompt + max_tokens) well under Groq's 8,000 TPM limit
    for (const model of candidateModels) {
      try {
        const createParams: any = {
          model,
          messages: [{ role: "system", content: context }, ...sanitizedMessages],
          max_tokens: 800,
          temperature: 0.3,
        };

        if (model.includes("gpt-oss")) {
          createParams.reasoning_format = "hidden";
        }

        const completion = await groq.chat.completions.create(createParams);
        const choice = completion.choices[0];
        completionText = choice?.message?.content?.trim() || null;

        if (completionText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Groq completion failed with model ${model}:`, err?.message || err);

        // If rate limit / TPM exceeded, try immediate ultra-condensed emergency prompt
        if (
          err?.status === 413 ||
          err?.status === 429 ||
          err?.code === "rate_limit_exceeded" ||
          err?.message?.includes("TPM")
        ) {
          try {
            const emergencySummary = `Total products: ${productsList.length}, Low: ${lowStock.length}, Out: ${outOfStock.length}. Critical: ${outOfStock
              .slice(0, 5)
              .map((p) => p.name)
              .join(", ")}.`;
            const retryRes = await groq.chat.completions.create({
              model,
              messages: [
                {
                  role: "system",
                  content: `You are Inventra AI. Answer concisely in clean bullet points.\n${emergencySummary}`,
                },
                ...sanitizedMessages.slice(-2),
              ],
              max_tokens: 350,
              temperature: 0.3,
            });
            completionText = retryRes.choices[0]?.message?.content?.trim() || null;
            if (completionText) break;
          } catch (retryErr) {
            console.warn(`Emergency compact retry failed for ${model}:`, retryErr);
          }
        }
        continue;
      }
    }

    if (completionText) {
      return Response.json({ message: completionText });
    }

    console.error("All Groq model attempts failed. Last error:", lastError);
    let errorMessage = "Unable to reach the AI assistant. Please try again in a moment.";
    const errObj = lastError as any;
    const rawMsg = errObj?.error?.message || errObj?.message || "";

    if (errObj?.status === 429 || rawMsg.includes("rate_limit_exceeded") || rawMsg.includes("TPM")) {
      errorMessage = "The AI rate limit was temporarily reached. Please ask a shorter question or wait a few seconds.";
    } else if (errObj?.status === 401 || errObj?.status === 403) {
      errorMessage = "AI authentication error. Please verify the GROQ_API_KEY environment variable.";
    } else if (rawMsg && typeof rawMsg === "string") {
      errorMessage = rawMsg;
    }

    return Response.json({ error: errorMessage }, { status: 500 });
  } catch (err: any) {
    console.error("POST /api/chat unhandled failure:", err);
    return Response.json(
      { error: err?.message || "Failed to process chat request. Please try again." },
      { status: 500 }
    );
  }
}
