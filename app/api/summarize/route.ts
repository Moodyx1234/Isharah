import { NextRequest, NextResponse } from "next/server";
import { getAnthropicClient, isApiKeyConfigured } from "@/lib/anthropic";
import { sampleReviewQuestions } from "@/lib/sample-transcript";

export async function POST(req: NextRequest) {
  try {
    const { transcript, locale = "ar" } = await req.json();

    if (!transcript || transcript.length === 0) {
      const questions = locale === "ar" ? sampleReviewQuestions.ar : sampleReviewQuestions.en;
      return NextResponse.json({
        summary: locale === "ar" ? "لا يوجد محتوى كافٍ لإنشاء ملخص." : "Not enough content to generate a summary.",
        key_points: [],
        review_questions: questions,
      });
    }

    if (!isApiKeyConfigured()) {
      const questions = locale === "ar" ? sampleReviewQuestions.ar : sampleReviewQuestions.en;
      return NextResponse.json({
        summary:
          locale === "ar"
            ? "تناولت المحاضرة موضوعات الخوارزميات وأنواعها الرئيسية، وشملت خوارزميات الفرز والبحث."
            : "The lecture covered algorithms and their main types, including sorting and search algorithms.",
        key_points:
          locale === "ar"
            ? ["الخوارزميات هي تعليمات منطقية لحل المشكلات", "خوارزميات الفرز: الفقاعي والسريع", "خوارزميات البحث: الخطي والثنائي"]
            : ["Algorithms are logical instructions for solving problems", "Sorting algorithms: bubble sort and quick sort", "Search algorithms: linear and binary search"],
        review_questions: questions,
      });
    }

    const client = getAnthropicClient();
    const transcriptText = transcript.map((e: { text: string }) => e.text).join("\n");

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1500,
      system:
        locale === "ar"
          ? "أنت مساعد تعليمي. بناءً على نص المحاضرة المعطى، قدم: 1) ملخصاً مختصراً للمحاضرة في فقرة واحدة، 2) قائمة بالنقاط الرئيسية (من 3 إلى 5 نقاط)، 3) خمسة أسئلة مراجعة مع إجاباتها. أجب بصيغة JSON فقط بالتنسيق التالي: {\"summary\": \"...\", \"key_points\": [...], \"review_questions\": [{\"q\": \"...\", \"a\": \"...\"}]}"
          : "You are an educational assistant. Based on the given lecture transcript, provide: 1) A brief summary in one paragraph, 2) A list of key points (3-5 points), 3) Five review questions with answers. Respond in JSON only with this format: {\"summary\": \"...\", \"key_points\": [...], \"review_questions\": [{\"q\": \"...\", \"a\": \"...\"}]}",
      messages: [{ role: "user", content: transcriptText }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json(parsed);
    }

    throw new Error("Invalid JSON response");
  } catch (err) {
    console.error("Summarize error:", err);
    const { locale = "ar" } = await req.json().catch(() => ({}));
    const questions = locale === "ar" ? sampleReviewQuestions.ar : sampleReviewQuestions.en;
    return NextResponse.json({
      summary:
        locale === "ar"
          ? "تناولت المحاضرة موضوعات الخوارزميات وأنواعها."
          : "The lecture covered algorithms and their types.",
      key_points: [],
      review_questions: questions,
    });
  }
}
