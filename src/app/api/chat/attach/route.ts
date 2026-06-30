import { NextRequest, NextResponse } from "next/server";
import * as whisper from "@server/whisper-proxy";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_CHARS = 12000;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const type = form.get("type");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const name = file instanceof File ? file.name : "attachment";

  try {
    if (type === "audio") {
      const data =
        process.env.MOCK_COLLECTORS === "1"
          ? { text: "(mock) transcribed audio attachment" }
          : await whisper.transcribe(file, { model: "whisper-1" });
      return NextResponse.json({ type: "audio", name, text: data.text });
    }

    if (type === "image") {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Not an image" }, { status: 400 });
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;
      return NextResponse.json({ type: "image", name, dataUrl });
    }

    if (type === "document") {
      const text = await extractDocumentText(file, name);
      const truncated = text.length > MAX_DOCUMENT_CHARS;
      return NextResponse.json({
        type: "document",
        name,
        text: truncated ? text.slice(0, MAX_DOCUMENT_CHARS) + "\n...[truncated]" : text,
      });
    }

    return NextResponse.json({ error: "Unknown attachment type" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}

async function extractDocumentText(file: Blob, name: string): Promise<string> {
  if (name.toLowerCase().endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const buf = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buf });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  return file.text();
}
