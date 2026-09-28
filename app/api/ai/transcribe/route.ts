export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const apiKey =
      process.env.ASSEMBLYAI_API_KEY?.trim() || "d02a976b62e847c7a4f3a6bd474102aa";

    if (!apiKey) {
      return Response.json(
        { error: "AssemblyAI API key is not configured on the server." },
        { status: 503 }
      );
    }

    let audioBuffer: ArrayBuffer | null = null;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("audio") as Blob | null;
      if (!file) {
        return Response.json({ error: "No audio file provided in form data." }, { status: 400 });
      }
      audioBuffer = await file.arrayBuffer();
    } else {
      audioBuffer = await req.arrayBuffer();
    }

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return Response.json({ error: "Audio buffer is empty." }, { status: 400 });
    }

    // 1. Upload audio to AssemblyAI
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: Buffer.from(audioBuffer),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("AssemblyAI upload failed:", uploadRes.status, errText);
      return Response.json(
        { error: `AssemblyAI upload failed: ${errText}` },
        { status: uploadRes.status }
      );
    }

    const { upload_url } = await uploadRes.json();
    if (!upload_url) {
      return Response.json({ error: "Failed to get upload URL from AssemblyAI" }, { status: 500 });
    }

    // 2. Submit transcription job
    const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: upload_url,
        punctuate: true,
        format_text: true,
      }),
    });

    if (!transcriptRes.ok) {
      const errText = await transcriptRes.text();
      console.error("AssemblyAI transcript request failed:", transcriptRes.status, errText);
      return Response.json(
        { error: `AssemblyAI transcript request failed: ${errText}` },
        { status: transcriptRes.status }
      );
    }

    const { id: transcriptId } = await transcriptRes.json();
    if (!transcriptId) {
      return Response.json({ error: "Failed to get transcript ID from AssemblyAI" }, { status: 500 });
    }

    // 3. Poll for transcript completion (up to 20 seconds)
    const startTime = Date.now();
    let transcriptText = "";

    while (Date.now() - startTime < 20000) {
      await new Promise((r) => setTimeout(r, 800));

      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { Authorization: apiKey },
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();
      if (pollData.status === "completed") {
        transcriptText = (pollData.text || "").trim();
        break;
      }

      if (pollData.status === "error") {
        console.error("AssemblyAI processing error:", pollData.error);
        return Response.json({ error: pollData.error || "Transcription failed" }, { status: 500 });
      }
    }

    return Response.json({
      success: true,
      text: transcriptText,
      transcriptId,
    });
  } catch (err: any) {
    console.error("POST /api/ai/transcribe error:", err);
    return Response.json(
      { error: err?.message || "Failed to process audio transcription." },
      { status: 500 }
    );
  }
}
