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

    const systemPrompt = `You are an expert AI retail inventory specialist and Indian FMCG product cataloger.
Given text scanned from product packaging and/or an Indian retail barcode (EAN-13 starting with 890...), extract clean, standardized retail product details.

GS1 INDIA MANUFACTURER PREFIX DIRECTORY (Crucial for 890... barcodes):
- "8901063...": Britannia Industries Ltd. Products include: Good Day (Butter Cookies, Cashew, Chocochip, Pista Badam), Marie Gold, Bourbon, NutriChoice, Milk Bikis, 50-50 Maska Chaska, Treat Jim Jam, Little Hearts, Tiger.
- "8901719...": Parle Products Pvt Ltd. Products include: Parle-G, Hide & Seek, Monaco, Krackjack, 20-20, Milano.
- "8901058...": Nestle India Ltd. Products include: Maggi 2-Minute Masala Noodles, KitKat, Munch, Nescafe Classic, Milkybar.
- "8901491...": PepsiCo India Holdings. Products include: Lay's Potato Chips (Magic Masala, Cream & Onion), Kurkure Masala Munch, Doritos.
- "8901725...": ITC Ltd. Products include: Sunfeast Dark Fantasy, Mom's Magic, Bingo, Aashirvaad Atta, Yippee Noodles.
- "8901030...": Hindustan Unilever Ltd. Products include: Surf Excel, Red Label, Knorr, Bru, Dove, Lifebuoy, Tata Salt.
- "8901262...": Amul / GCMMF. Products include: Amul Butter, Amul Cheese, Amul Taaza Milk, Amul Kool.
- "8901314...": Colgate-Palmolive India. Products include: Colgate Strong Teeth, Colgate MaxFresh.
- "8901396...": Reckitt Benckiser India. Products include: Dettol Antiseptic, Harpic, Lizol, Moov Spray.
- "8906007...": Adani Wilmar. Products include: Fortune Sunflower/Mustard Oil, Kohinoor.
- "8904063...": Haldiram Foods. Products include: Haldiram's Aloo Bhujia, Bhujia Sev, Namkeen.
- "8902080...": Dabur India. Products include: Dabur Honey, Dabur Red Toothpaste, Real Juice.
- "8901207...": Marico Ltd. Products include: Parachute Coconut Oil, Saffola Gold.
- "8901088...": Mondelez / Cadbury India. Products include: Dairy Milk, 5 Star, Perk, Oreo, Bournvita.

INFERENCE RULES:
1. If the text mentions "Good Day" or "goodday" or the barcode begins with 8901063, brand is "Britannia", category is "Biscuits", name is typically "Good Day Butter Cookies" (or Cashew if cashew is mentioned).
2. If text mentions "Parle-G" or "parleg" or barcode begins with 8901719, brand is "Parle", category is "Biscuits", name is "Parle-G Gluco Biscuits".
3. If text mentions "Maggi" or barcode begins with 8901058, brand is "Nestle", category is "Packaged Foods", name is "Maggi 2-Minute Masala Noodles".
4. Never return an empty string for "name" or "brand" if the brand or product line can be deduced from the barcode prefix or text.

You must respond ONLY with a valid JSON object with the following fields:
- "name": Clean, proper product name (e.g. "Good Day Butter Cookies", "Maggi 2-Minute Noodles", "Dettol Antiseptic Liquid"). Do NOT repeat words or include junk characters.
- "brand": Brand name (e.g. "Britannia", "Nestle", "Amul", "ITC", "Hindustan Unilever", "Parle").
- "category": Standard retail category (choose from: "Biscuits", "Packaged Foods", "Dairy & Chilled", "Beverages", "Household", "Personal Care", "Pharmaceuticals", "Snacks").
- "weight": Net weight or volume with unit (e.g. "200g", "100g", "58g", "1kg", "500ml", "1L"). Empty string if unknown.
- "mrp": Maximum retail price as a number string (e.g. "10.00", "20.00", "35.00"). Empty string if unknown.
- "packageSize": Packaging description (e.g. "Single Pack", "100g Pack", "200g Pack", "Pouch", "Bottle").
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
