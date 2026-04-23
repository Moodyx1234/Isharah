import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, isApiKeyConfigured } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { imageData, locale = "ar" } = body;

    if (!imageData) {
      return NextResponse.json({ error: "imageData required" }, { status: 400 });
    }

    const client = getAnthropicClient();

    const base64Data = imageData.split(",")[1] || imageData;
    const mediaType = imageData.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    const langInstruction =
      locale === "ar"
        ? "وصف هذه الشريحة باللغة العربية"
        : "Describe this slide in English";

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 500,
      system:
        locale === "ar"
          ? "أنت مساعد إتاحة يصف المحتوى الأكاديمي للطلاب المكفوفين. اوصف هذه الشريحة بإيجاز ووضوح باللغة العربية. اذكر الرسوم البيانية، النصوص الرئيسية، والتخطيط البصري. لا تزيد عن ثلاث جمل."
          : "You are an accessibility assistant describing academic content for blind students. Describe this lecture slide concisely in English. Mention charts, key text, and visual layout. Maximum 3 sentences.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            { type: "text", text: langInstruction },
          ],
        },
      ],
    });

    const description =
      message.content[0].type === "text" ? message.content[0].text : "";

    const wordCount = description.split(/\s+/).length;
    const estimatedSeconds = Math.ceil(wordCount / 3);

    return NextResponse.json({ description, duration_estimate_seconds: estimatedSeconds });
  } catch (err) {
    console.error("Describe error:", err);
    return NextResponse.json({ error: "Failed to describe image" }, { status: 500 });
  }
}
