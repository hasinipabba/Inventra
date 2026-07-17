import Groq from "groq-sdk";
import { sql } from "@/lib/pg";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const [products, warehouses, procurement, expiring] = await Promise.all([
      sql`SELECT name, sku, stock, status, "expiryDate", warehouse, category
          FROM products
          ORDER BY "lastUpdated" DESC NULLS LAST
          LIMIT 100`,
      sql`SELECT id, name, location FROM warehouses`,
      sql`SELECT product, quantity, status, date
          FROM purchase_requests
          WHERE LOWER(status) = 'pending'
          LIMIT 20`,
      sql`SELECT name, sku, "expiryDate", stock, warehouse
          FROM products
          WHERE "expiryDate" ~ '^\d{4}-\d{2}-\d{2}$'
            AND "expiryDate"::date <= CURRENT_DATE + INTERVAL '7 days'
            AND "expiryDate"::date > CURRENT_DATE
          ORDER BY "expiryDate"::date ASC
          LIMIT 20`,
    ]);

    const context = `
You are Inventra AI, an inventory management assistant. You have access to live inventory data. Answer questions based only on this data. Be concise and specific.

CURRENT INVENTORY SUMMARY:
Total products: ${products.length}
Low stock: ${products.filter((p) => p.status === "low").length}
Out of stock: ${products.filter((p) => p.status === "out").length}
Expiring in 7 days: ${expiring.length}

WAREHOUSES:
${warehouses.map((w) => `- ${w.name} (${w.location})`).join("\n")}

PRODUCTS (recent 100):
${products.map((p) => `- ${p.name} | SKU: ${p.sku} | Qty: ${p.stock} | Status: ${p.status} | Expiry: ${p.expiryDate ?? "N/A"} | Warehouse: ${p.warehouse} | Category: ${p.category}`).join("\n")}

EXPIRING SOON:
${expiring.length === 0 ? "None" : expiring.map((p) => `- ${p.name} | SKU: ${p.sku} | Expires: ${p.expiryDate} | Qty: ${p.stock}`).join("\n")}

PENDING PURCHASE REQUESTS:
${procurement.length === 0 ? "None" : procurement.map((p) => `- ${p.product} | Qty requested: ${p.quantity} | Date: ${p.date}`).join("\n")}
    `.trim();

    const completion = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: context },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.3,
    });

    return Response.json({ message: completion.choices[0].message.content });
  } catch (err) {
    console.error("POST /api/chat failed:", err);
    return Response.json({ error: "Failed to get a response. Please try again." }, { status: 500 });
  }
}
