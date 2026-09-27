import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const { rawText, barcode, draft } = await req.json();

    if (!rawText && !barcode) {
      return Response.json(
        { success: false, error: "Please provide either packaging text or barcode." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return Response.json(
        {
          success: false,
          error: "GROQ_API_KEY is not configured on server. Please add your Groq key to environment variables.",
        },
        { status: 503 }
      );
    }

    const groq = new Groq({ apiKey });

    const systemPrompt = `You are an expert AI retail inventory specialist and product cataloger.
Given text scanned from product packaging (or a barcode and any partial info), extract clean, standardized retail product details.

You must respond ONLY with a valid JSON object with the following fields:
- "name": Clean, proper product name (e.g. "Good Day Butter Cookies", "Maggi 2-Minute Noodles", "Dettol Antiseptic Liquid"). Do NOT repeat words or include junk characters.
- "brand": Brand name (e.g. "Britannia", "Nestle", "Amul", "ITC", "Hindustan Unilever", "Parle").
- "category": Standard retail category (choose from: "Packaged Foods", "Dairy & Chilled", "Beverages", "Household", "Personal Care", "Pharmaceuticals", "Produce", "Snacks", "Biscuits", "Bakery").
- "weight": Net weight or volume with unit (e.g. "200g", "1kg", "500ml", "1L"). Empty string if unknown.
- "mrp": Maximum retail price as a number string (e.g. "30.00", "120"). Empty string if unknown.
- "packageSize": Packaging description (e.g. "Single Pack", "200g Pouch", "Family Pack", "Bottle").
- "description": Brief 1-2 sentence description of the product.
- "mfgDate": Manufacturing date in YYYY-MM-DD format if detected, otherwise empty string.
- "expiryDate": Expiry or Best Before date in YYYY-MM-DD format if detected, otherwise empty string.
- "batchNumber": Alphanumeric manufacturing batch or lot number if detected (must contain digits or code prefix; NEVER regular dictionary words like BISCUITS). Empty string if unknown.
- "confidence": A number from 0 to 100 representing how confident you are in the extraction.

Always clean up OCR spelling mistakes (e.g. "BRITANNYA" -> "Britannia", "G00DDAY" -> "Good Day", "11/03/24" -> "2024-03-11").`;

    const userPrompt = `Product Packaging Text:
"""
${rawText || "No OCR text"}
"""
Barcode: ${barcode || "None"}
Existing draft: ${JSON.stringify(draft || {})}`;

    const candidateModels = [
      process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
    ];

    let extractedData: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 800,
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          extractedData = JSON.parse(content);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Groq parse-product model ${model} failed:`, err?.message);
        if (err?.status === 404 || err?.status === 400 || err?.code === "model_not_found") {
          continue;
        }
        break;
      }
    }

    if (!extractedData) {
      throw lastError || new Error("Failed to extract product details from AI");
    }

    return Response.json({
      success: true,
      product: {
        name: extractedData.name || "",
        brand: extractedData.brand || "",
        category: extractedData.category || "Packaged Foods",
        weight: extractedData.weight || "",
        mrp: extractedData.mrp ? String(extractedData.mrp) : "",
        packageSize: extractedData.packageSize || "",
        description: extractedData.description || "",
        mfgDate: extractedData.mfgDate || "",
        expiryDate: extractedData.expiryDate || "",
        batchNumber: extractedData.batchNumber || "",
        confidence: extractedData.confidence ?? 85,
      },
    });
  } catch (err: any) {
    console.error("AI parse-product failed:", err);
    return Response.json(
      { success: false, error: err?.message || "Failed to parse product with AI" },
      { status: 500 }
    );
  }
}
