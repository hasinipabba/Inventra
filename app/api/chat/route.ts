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

    // Safely compute products expiring within 7 days
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = productsList.filter((p) => {
      if (!p.expiryDate) return false;
      const d = new Date(p.expiryDate);
      return !isNaN(d.getTime()) && d >= now && d <= in7Days;
    });

    const recentProducts = productsList.slice(0, 100);

    const context = `
You are Inventra AI, a knowledgeable and concise inventory intelligence assistant.
You have access to live inventory, warehouse, and purchase request data.

FORMATTING RULES FOR MAXIMUM READABILITY:
- Structure your response using clean, bite-sized paragraphs separated by blank lines.
- When listing items, products, or metrics, format them as clean bullet points with bold titles (e.g., "* **Product Name**: Details").
- When suggesting next steps or actions, use a numbered list (e.g., "1. Action step").
- Do NOT output dense, unbroken walls of text.
- Be direct, specific, and actionable.

CURRENT INVENTORY SUMMARY:
Total products: ${productsList.length}
Low stock: ${productsList.filter((p) => p.status === "low").length}
Out of stock: ${productsList.filter((p) => p.status === "out").length}
Expiring in 7 days: ${expiringSoon.length}

WAREHOUSES:
${warehousesList.map((w) => `- ${w.name}${w.location ? ` (${w.location})` : ""}`).join("\n")}

PRODUCTS (recent ${recentProducts.length}):
${recentProducts
  .map(
    (p) =>
      `- ${p.name} | SKU: ${p.sku ?? "N/A"} | Qty: ${p.stock ?? 0} | Status: ${p.status ?? "in"} | Expiry: ${
        p.expiryDate ?? "N/A"
      } | Warehouse: ${p.warehouse ?? "Unassigned"} | Category: ${p.category ?? "General"}`
  )
  .join("\n")}

EXPIRING SOON:
${
  expiringSoon.length === 0
    ? "None"
    : expiringSoon
        .map((p) => `- ${p.name} | SKU: ${p.sku ?? "N/A"} | Expires: ${p.expiryDate} | Qty: ${p.stock ?? 0}`)
        .join("\n")
}

PENDING PURCHASE REQUESTS:
${
  pendingProcurement.length === 0
    ? "None"
    : pendingProcurement
        .map((p) => `- ${p.product ?? "Unknown item"} | Qty requested: ${p.quantity ?? 0} | Date: ${p.date ?? "N/A"}`)
        .join("\n")
}
`.trim();

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

    for (const model of candidateModels) {
      try {
        const createParams: any = {
          model,
          messages: [{ role: "system", content: context }, ...messages],
          max_tokens: 2048,
          temperature: 0.3,
        };

        // For models that support reasoning_format, hide reasoning so user only gets clean paragraphs
        if (model.includes("gpt-oss")) {
          createParams.reasoning_format = "hidden";
        }

        const completion = await groq.chat.completions.create(createParams);

        const choice = completion.choices[0];
        completionText = choice?.message?.content?.trim() || null;

        // Only accept actual assistant content — never display raw internal scratchpads
        if (completionText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Groq completion failed with model ${model}:`, err?.message || err);
        // Continue to try the next model candidate
        continue;
      }
    }

    if (completionText) {
      return Response.json({ message: completionText });
    }

    console.error("All Groq model attempts failed. Last error:", lastError);
    let errorMessage = "Unable to reach the AI assistant. Please try again in a moment.";
    const errObj = lastError as any;
    if (errObj?.status === 429) {
      errorMessage = "The AI service is experiencing high demand. Please try again in a few seconds.";
    } else if (errObj?.status === 401 || errObj?.status === 403) {
      errorMessage = "AI authentication error. Please verify the GROQ_API_KEY environment variable.";
    } else if (errObj?.error?.message && typeof errObj.error.message === "string") {
      errorMessage = errObj.error.message;
    } else if (errObj?.message && typeof errObj.message === "string") {
      errorMessage = errObj.message;
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
