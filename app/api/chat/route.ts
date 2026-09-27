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
You are Inventra AI, an inventory management assistant. You have access to live inventory data. Answer questions based only on this data. Be concise and specific.

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

    // Candidate models to try in priority order
    const candidateModels = Array.from(
      new Set(
        [
          process.env.GROQ_MODEL,
          "openai/gpt-oss-120b",
          "openai/gpt-oss-20b",
          "llama-3.3-70b-versatile",
          "llama-3.1-8b-instant",
        ].filter((m): m is string => Boolean(m && m.trim()))
      )
    );

    let lastError: unknown = null;
    let completionText: string | null = null;

    for (const model of candidateModels) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [{ role: "system", content: context }, ...messages],
          max_tokens: 1024,
          temperature: 0.3,
        });

        completionText = completion.choices[0]?.message?.content ?? null;
        if (completionText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Groq completion failed with model ${model}:`, err?.message || err);
        // Continue to try next candidate if model not found or decommissioned
        if (err?.status === 404 || err?.status === 400 || err?.code === "model_not_found") {
          continue;
        }
        // If it's a rate limit or auth error, don't keep hammering
        break;
      }
    }

    if (completionText) {
      return Response.json({ message: completionText });
    }

    console.error("All Groq model attempts failed. Last error:", lastError);
    const errorMessage =
      (lastError as any)?.error?.message ||
      (lastError as any)?.message ||
      "Failed to get a response from the AI model. Please try again.";

    return Response.json({ error: errorMessage }, { status: 500 });
  } catch (err: any) {
    console.error("POST /api/chat unhandled failure:", err);
    return Response.json(
      { error: err?.message || "Failed to process chat request. Please try again." },
      { status: 500 }
    );
  }
}
