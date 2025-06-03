import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(req: NextRequest) {
    try {
        const { content, documents } = await req.json();

        if (!content || !documents) {
            return NextResponse.json({ suggestions: [] }, { status: 400 });
        }

        // Filter out very short content to avoid noise
        if (content.trim().length < 10) {
            return NextResponse.json({ suggestions: [] });
        }
        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `You are an intelligent document linking assistant for a Notion-like workspace. Your task is to analyze the current content and suggest relevant existing documents that would be valuable to link to.

Rules:
1. Only suggest documents that are genuinely relevant to the current content
2. Look for topical connections, shared concepts, or complementary information
3. Prioritize quality over quantity - suggest 2-4 most relevant documents maximum
4. Return ONLY valid JSON in this exact format: [{"documentId": "document_id", "title": "Document Title", "relevance": 0.9, "suggestedText": "specific text to link", "reason": "Brief explanation of relevance"}]
5. If no relevant documents exist, return an empty array: []
6. Do not suggest documents with very similar titles to avoid circular linking
7. Focus on semantic relationships, not just keyword matches
8. The suggestedText should be a specific phrase from the content that relates to the suggested document
9. Relevance should be between 0.7 and 1.0, only suggest documents with relevance > 0.75

Current content being written: "${content}"

Available documents in workspace:
${documents.map((doc: any) => `- "${doc.title}" (ID: ${doc._id}): ${doc.content ? doc.content.substring(0, 200) + "..." : "No content preview"}`).join("\n")}

Analyze the current content and suggest the most relevant documents to link to. Focus on documents that provide context, related information, or complementary perspectives. Only return documents with high relevance scores.`,
                            },
                        ],
                    },
                ],
            }),
        });

        const geminiResponse = await response.json();
        const responseContent =
            geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
        let suggestions = [];
        try {
            if (responseContent) {
                // Handle both raw JSON and markdown-wrapped JSON
                let cleanedContent = responseContent.trim();

                // Remove markdown code block wrapper if present
                if (cleanedContent.startsWith("```json")) {
                    cleanedContent = cleanedContent
                        .replace(/^```json\s*/, "")
                        .replace(/\s*```$/, "");
                } else if (cleanedContent.startsWith("```")) {
                    cleanedContent = cleanedContent
                        .replace(/^```\s*/, "")
                        .replace(/\s*```$/, "");
                }

                suggestions = JSON.parse(cleanedContent);
                // Validate the structure and filter by relevance
                if (Array.isArray(suggestions)) {
                    suggestions = suggestions.filter(
                        (s) =>
                            s.documentId &&
                            s.title &&
                            s.relevance &&
                            s.suggestedText &&
                            typeof s.documentId === "string" &&
                            typeof s.title === "string" &&
                            typeof s.relevance === "number" &&
                            s.relevance > 0.75
                    );
                } else {
                    suggestions = [];
                }
            }
        } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
            console.error("Raw response:", responseContent);
            suggestions = [];
        }

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error("Auto-linker error:", error);
        return NextResponse.json({ suggestions: [] }, { status: 500 });
    }
}
