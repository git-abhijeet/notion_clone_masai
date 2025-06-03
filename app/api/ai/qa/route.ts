import { NextRequest, NextResponse } from "next/server";
import {
    getPineconeClient,
    PINECONE_INDEX_NAME,
    isValidConvexId,
} from "@/lib/pinecone";
import { generateEmbedding } from "@/lib/embeddings";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/**
 * Extract plain text from BlockNote JSON format with enhanced robustness
 * for different document structures
 */
function extractTextFromBlockNote(blockData: any): string {
    // Handle direct string input
    if (typeof blockData === "string") {
        return blockData;
    }

    // Handle null or undefined
    if (!blockData) {
        return "";
    }

    // Convert non-array objects to array if needed
    const blocks = Array.isArray(blockData) ? blockData : [blockData];
    const textParts: string[] = [];

    for (const block of blocks) {
        if (!block || typeof block !== "object") continue;

        // Direct text property (some formats use this)
        if (typeof block.text === "string") {
            textParts.push(block.text);
            continue;
        }

        // Handle Markdown formatting that may be embedded
        if (typeof block.content === "string") {
            textParts.push(block.content);
            continue;
        }

        // Extract text from content array (BlockNote standard)
        if (block.content && Array.isArray(block.content)) {
            for (const contentItem of block.content) {
                // Handle direct string in content array
                if (typeof contentItem === "string") {
                    textParts.push(contentItem);
                    continue;
                }

                // Handle text property in content items
                if (contentItem && contentItem.text) {
                    textParts.push(contentItem.text);
                }

                // Handle different content item structures
                if (
                    contentItem &&
                    contentItem.type === "text" &&
                    contentItem.text
                ) {
                    textParts.push(contentItem.text);
                }
            }
        }

        // Recursively extract from children
        if (block.children && Array.isArray(block.children)) {
            const childrenText = extractTextFromBlockNote(block.children);
            if (childrenText) {
                textParts.push(childrenText);
            }
        }

        // Handle props that might contain text in some formats
        if (block.props && typeof block.props === "object") {
            Object.values(block.props).forEach((prop) => {
                if (typeof prop === "string") {
                    textParts.push(prop);
                }
            });
        }
    }

    return textParts.join(" ").trim();
}

export async function POST(req: NextRequest) {
    try {
        const {
            question,
            documents,
            useVectorSearch = true,
        } = await req.json();

        if (!question) {
            return NextResponse.json({
                response: "Please provide a question to search.",
                sources: [],
                confidence: 0,
            });
        }

        let relevantDocs: any[] = [];

        if (useVectorSearch) {
            try {
                // Use vector search with Pinecone
                const queryEmbedding = await generateEmbedding(question);
                const pinecone = await getPineconeClient();
                const index = pinecone.index(PINECONE_INDEX_NAME);

                const searchResults = await index.query({
                    vector: queryEmbedding,
                    topK: 8,
                    includeMetadata: true,
                }); // Convert Pinecone results to document format with text extraction
                relevantDocs =
                    searchResults.matches
                        ?.map((match) => {
                            const rawContent = String(
                                match.metadata?.content || ""
                            );

                            // Extract plain text if content is in BlockNote JSON format
                            let extractedContent = rawContent;
                            try {
                                const parsedContent = JSON.parse(rawContent);
                                extractedContent =
                                    extractTextFromBlockNote(parsedContent);
                            } catch (error) {
                                // If parsing fails, use raw content
                            } // Check if the document ID is a valid Convex ID
                            const docId = String(
                                match.metadata?.documentId || match.id
                            );
                            // Use the isConvexId flag from metadata if available, otherwise check with the utility
                            const validId =
                                typeof match.metadata?.isConvexId === "boolean"
                                    ? match.metadata.isConvexId
                                    : isValidConvexId(docId);

                            return {
                                _id: docId,
                                title: String(
                                    match.metadata?.title || "Untitled Document"
                                ),
                                content: extractedContent || rawContent,
                                relevanceScore: (match.score || 0) * 100, // Convert to percentage
                                isValidConvexId: validId,
                            };
                        })
                        .filter(
                            (doc) => doc.content && doc.content.length > 10
                        ) || [];

                console.log(
                    `Vector search found ${relevantDocs.length} relevant documents`
                );
            } catch (vectorError) {
                console.error(
                    "Vector search failed, falling back to keyword search:",
                    vectorError
                );
                // Fall back to keyword search if vector search fails
                relevantDocs = performKeywordSearch(question, documents || []);
            }
        } else {
            // Use traditional keyword search as fallback
            relevantDocs = performKeywordSearch(question, documents || []);
        }

        if (relevantDocs.length === 0) {
            return NextResponse.json({
                response: useVectorSearch
                    ? "I couldn't find any relevant documents in your workspace that address this question. This might be because your documents haven't been indexed yet, or there's no content matching your query."
                    : "I couldn't find any relevant documents in your workspace that address this question. Please make sure you have documents with content related to your query.",
                sources: [],
                confidence: 0,
            });
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
                                text: `You are an expert knowledge assistant for a personal workspace. Your role is to provide comprehensive, accurate answers based ONLY on the provided documents.

Guidelines:
1. ONLY use information from the provided documents - never add external knowledge
2. Provide specific, detailed answers with relevant information from the documents
3. Always cite which documents you're referencing by title
4. If the documents don't contain enough information, clearly state what's missing
5. Structure your response clearly with main points and supporting details
6. When multiple documents discuss the same topic, synthesize the information
7. Include relevant quotes or specific details when they add value
8. If conflicting information exists across documents, mention both perspectives
9. Rate your confidence level (0-100%) based on how well the documents address the question
10. READ CAREFULLY - extract ALL relevant information from the documents provided

Format your response as:
**Answer:** [Your detailed answer]

**Sources Referenced:** [List the document titles you used]

**Confidence:** [0-100%] - [Brief explanation of confidence level]

Question: ${question}

Relevant Workspace Documents:
${relevantDocs
    .map(
        (doc: any, index: number) =>
            `${index + 1}. Document: "${doc.title}"
   Content: ${doc.content?.substring(0, 1200)}${doc.content?.length > 1200 ? "..." : ""}            `
    )
    .join("")}

Please provide a comprehensive answer based on these documents. Make sure to extract ALL relevant information that answers the question, especially from any sections that directly address the question topic.`,
                            },
                        ],
                    },
                ],
            }),
        });

        const geminiResponse = await response.json();
        const responseContent =
            geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text ||
            "I couldn't generate a response.";

        // Extract confidence score from response if present
        const confidenceMatch = responseContent.match(
            /\*\*Confidence:\*\*\s*(\d+)%/
        );
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;

        // Identify sources mentioned in the response
        const mentionedSources = relevantDocs.filter((doc: any) =>
            responseContent.toLowerCase().includes(doc.title.toLowerCase())
        ); // Filter and map sources to include validation info
        const formatSources = (docs: any[]) => {
            return docs.map((doc: any) => ({
                id: doc._id,
                title: doc.title,
                isValidId:
                    doc.isValidConvexId !== undefined
                        ? doc.isValidConvexId
                        : isValidConvexId(doc._id),
            }));
        };

        return NextResponse.json({
            response: responseContent,
            sources:
                mentionedSources.length > 0
                    ? formatSources(mentionedSources)
                    : formatSources(relevantDocs.slice(0, 3)),
            confidence,
        });
    } catch (error) {
        console.error("Q&A error:", error);
        return NextResponse.json(
            {
                response:
                    "Sorry, I encountered an error while processing your question. Please try again.",
                sources: [],
                confidence: 0,
            },
            { status: 500 }
        );
    }
}

// Fallback keyword search function
function performKeywordSearch(question: string, documents: any[]) {
    return documents
        .filter((doc: any) => doc.content && doc.content.length > 50)
        .map((doc: any) => {
            const questionLower = question.toLowerCase();
            const docTitleLower = doc.title.toLowerCase();
            const docContentLower = doc.content?.toLowerCase() || "";

            // Check if any significant word from question appears in title
            const titleMatch = questionLower
                .split(" ")
                .filter((word: string) => word.length > 3)
                .some((word: string) => docTitleLower.includes(word));

            // Check if any significant word from question appears in content
            const contentMatch = questionLower
                .split(" ")
                .filter((word: string) => word.length > 3)
                .some((word: string) => docContentLower.includes(word));

            // Also check for partial matches and context relevance
            const contextMatch =
                docContentLower.includes(questionLower) ||
                docTitleLower.includes(questionLower);

            return {
                ...doc,
                relevanceScore:
                    (titleMatch ? 3 : 0) +
                    (contentMatch ? 2 : 0) +
                    (contextMatch ? 1 : 0),
            };
        })
        .filter((doc: any) => doc.relevanceScore > 0)
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
        .slice(0, 8);
}
