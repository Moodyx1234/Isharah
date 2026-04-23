import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, isApiKeyConfigured } from "@/lib/anthropic";
import { textToGestureTokens } from "@/lib/sign-language/gestures";

export async function POST(req: NextRequest) {
  let text = "";
  let locale = "ar";

  try {
    const body = await req.json();
    text = body.text || "";
    locale = body.locale || "ar";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isApiKeyConfigured()) {
    const tokens = textToGestureTokens(text);
    return NextResponse.json({ simplified: text, tokens });
  }

  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  try {
    const client = getAnthropicClient();

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 300,
      system:
        locale === "ar"
          ? "أنت مساعد لتبسيط الجمل العربية لتناسب لغة الإشارة السعودية. أعد صياغة الجملة المعطاة بترتيب كلمات وبنية أقرب إلى لغة الإشارة السعودية. احذف أدوات التعريف والروابط غير الضرورية. حافظ على المعنى. أرجع النص المبسط فقط بدون شرح."
          : "Rephrase the given sentence into a word order closer to Saudi Sign Language. Remove articles, simplify syntax, keep meaning. Return only the rephrased text without explanation.",
      messages: [{ role: "user", content: text }],
    });

    const simplified =
      message.content[0].type === "text" ? message.content[0].text.trim() : text;

    const tokens = textToGestureTokens(simplified);
    return NextResponse.json({ simplified, tokens });
  } catch (err) {
    console.error("Rephrase error:", err);
    const tokens = textToGestureTokens(text);
    return NextResponse.json({ simplified: text, tokens });
  }
}
