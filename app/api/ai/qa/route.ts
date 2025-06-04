import { NextRequest, NextResponse } from "next/server";
import {
    getPineconeClient,
    PINECONE_INDEX_NAME,
    isValidConvexId,
} from "@/lib/pinecone";
import { generateEmbedding } from "@/lib/embeddings";
import { verifyEnvironmentVariables } from "@/lib/verify-env";

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
        // Verify environment variables first
        try {
            verifyEnvironmentVariables();
        } catch (error) {
            console.error("Environment verification failed:", error);
            return NextResponse.json(
                {
                    response:
                        "Server configuration error. Please check environment variables.",
                    sources: [],
                    confidence: 0,
                },
                { status: 500 }
            );
        }
        const { question, documents } = await req.json();

        console.log("QA request received:", {
            question,
            documentsProvided: documents ? documents.length : 0,
        });

        if (!question) {
            return NextResponse.json({
                response: "Please provide a question to search.",
                sources: [],
                confidence: 0,
            });
        }
        let relevantDocs: any[] = [];
        try {
            console.log(
                "🔍 [VECTOR SEARCH] Starting vector search for question:",
                question
            );
            console.log(
                "🔍 [VECTOR SEARCH] Question length:",
                question.length,
                "characters"
            );

            const queryEmbedding = await generateEmbedding(question);
            console.log(
                "🔍 [VECTOR SEARCH] Generated query embedding successfully"
            );
            console.log(
                "🔍 [VECTOR SEARCH] Embedding dimensions:",
                queryEmbedding.length
            );
            console.log(
                "🔍 [VECTOR SEARCH] First 5 embedding values:",
                queryEmbedding.slice(0, 5)
            );

            const pinecone = await getPineconeClient();
            const index = pinecone.index(PINECONE_INDEX_NAME);
            console.log(
                "🔍 [VECTOR SEARCH] Connected to Pinecone index:",
                PINECONE_INDEX_NAME
            );

            // Get index stats before search
            const stats = await index.describeIndexStats();
            console.log("📊 [PINECONE STATS] Current index statistics:", {
                totalVectors: stats.totalRecordCount,
                dimensions: stats.dimension,
                namespaces: stats.namespaces,
            });

            console.log(
                "🔍 [VECTOR SEARCH] Executing Pinecone query with params:",
                {
                    topK: 8,
                    includeMetadata: true,
                    embeddingLength: queryEmbedding.length,
                }
            );

            const searchResults = await index.query({
                vector: queryEmbedding,
                topK: 8,
                includeMetadata: true,
            });
            console.log("🚀 ~ POST ~ searchResults:", searchResults);

            console.log("✅ [PINECONE RESPONSE] Raw search results received:");
            console.log(
                "📊 [PINECONE RESPONSE] Match count:",
                searchResults.matches?.length || 0
            );
            console.log(
                "📊 [PINECONE RESPONSE] Results overview:",
                searchResults.matches?.map((match, idx) => ({
                    position: idx + 1,
                    score: match.score,
                    documentId: match.metadata?.documentId || match.id,
                    title: match.metadata?.title,
                    contentLength: String(match.metadata?.content || "").length,
                })) || []
            );

            if (searchResults.matches && searchResults.matches.length > 0) {
                console.log("🎯 [PINECONE RESPONSE] Top result details:");
                const topMatch = searchResults.matches[0];
                console.log("  - Score:", topMatch.score);
                console.log(
                    "  - Document ID:",
                    topMatch.metadata?.documentId || topMatch.id
                );
                console.log("  - Title:", topMatch.metadata?.title);
                console.log(
                    "  - Content preview:",
                    String(topMatch.metadata?.content || "").substring(0, 200) +
                        "..."
                );
                console.log(
                    "  - Full metadata keys:",
                    Object.keys(topMatch.metadata || {})
                );
            } // Convert Pinecone results to document format with text extraction
            console.log(
                "🔄 [DATA PROCESSING] Processing Pinecone results into document format..."
            );
            relevantDocs =
                searchResults.matches
                    ?.map((match, index) => {
                        console.log(
                            `📄 [DOCUMENT ${index + 1}] Processing match:`,
                            {
                                id: match.metadata?.documentId || match.id,
                                title: match.metadata?.title,
                                score: match.score,
                                rawContentLength: String(
                                    match.metadata?.content || ""
                                ).length,
                            }
                        );

                        const rawContent = String(
                            match.metadata?.content || ""
                        );

                        // Extract plain text if content is in BlockNote JSON format
                        let extractedContent = rawContent;
                        console.log(
                            `📄 [DOCUMENT ${index + 1}] Raw content preview:`,
                            rawContent.substring(0, 150) + "..."
                        );

                        try {
                            const parsedContent = JSON.parse(rawContent);
                            extractedContent =
                                extractTextFromBlockNote(parsedContent);
                            console.log(
                                `📄 [DOCUMENT ${index + 1}] Extracted text from BlockNote JSON format`
                            );
                            console.log(
                                `📄 [DOCUMENT ${index + 1}] Extracted content preview:`,
                                extractedContent.substring(0, 150) + "..."
                            );
                        } catch (error) {
                            console.log(
                                `📄 [DOCUMENT ${index + 1}] Content is not JSON, using raw content`
                            );
                            // If parsing fails, use raw content
                        }

                        // Check if the document ID is a valid Convex ID
                        const docId = String(
                            match.metadata?.documentId || match.id
                        );
                        // Use the isConvexId flag from metadata if available, otherwise check with the utility
                        const validId =
                            typeof match.metadata?.isConvexId === "boolean"
                                ? match.metadata.isConvexId
                                : isValidConvexId(docId);

                        const processedDoc = {
                            _id: docId,
                            title: String(
                                match.metadata?.title || "Untitled Document"
                            ),
                            content: extractedContent || rawContent,
                            relevanceScore: (match.score || 0) * 100, // Convert to percentage
                            isValidConvexId: validId,
                        };

                        console.log(
                            `📄 [DOCUMENT ${index + 1}] Final processed document:`,
                            {
                                id: processedDoc._id,
                                title: processedDoc.title,
                                contentLength: processedDoc.content.length,
                                relevanceScore: processedDoc.relevanceScore,
                                isValidConvexId: processedDoc.isValidConvexId,
                            }
                        );

                        return processedDoc;
                    })
                    .filter((doc) => {
                        const isValid = doc.content && doc.content.length > 10;
                        if (!isValid) {
                            console.log(
                                `❌ [FILTERING] Rejected document "${doc.title}" - content too short (${doc.content?.length || 0} chars)`
                            );
                        }
                        return isValid;
                    }) || [];

            console.log(
                `✅ [DATA PROCESSING] Successfully processed ${relevantDocs.length} relevant documents`
            );
            relevantDocs.forEach((doc, idx) => {
                console.log(
                    `📋 [FINAL DOCS] Document ${idx + 1}: "${doc.title}" (${doc.content.length} chars, score: ${doc.relevanceScore.toFixed(1)}%)`
                );
            });
        } catch (vectorError) {
            console.error(
                "❌ [VECTOR SEARCH ERROR] Vector search failed:",
                vectorError
            );
            return NextResponse.json(
                {
                    response:
                        "Sorry, I encountered an error while searching your documents. Please try again.",
                    sources: [],
                    confidence: 0,
                },
                { status: 500 }
            );
        }
        if (relevantDocs.length === 0) {
            console.log("❌ [NO RESULTS] No relevant documents found");
            return NextResponse.json({
                response:
                    "I couldn't find any relevant documents in your workspace that address this question. This might be because your documents haven't been indexed yet, or there's no content matching your query.",
                sources: [],
                confidence: 0,
            });
        }

        console.log(
            "🤖 [AI GENERATION] Preparing to send request to Gemini AI..."
        );
        console.log(
            "🤖 [AI GENERATION] Documents to include in context:",
            relevantDocs.length
        );

        const contextDocuments = relevantDocs
            .map(
                (doc: any, index: number) =>
                    `${index + 1}. Document: "${doc.title}"
   Content: ${doc.content?.substring(0, 1200)}${doc.content?.length > 1200 ? "..." : ""}            `
            )
            .join("");

        console.log(
            "🤖 [AI GENERATION] Total context length:",
            contextDocuments.length,
            "characters"
        );
        console.log(
            "🤖 [AI GENERATION] Context preview:",
            contextDocuments.substring(0, 300) + "..."
        );

        const requestBody = {
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
${contextDocuments}

Please provide a comprehensive answer based on these documents. Make sure to extract ALL relevant information that answers the question, especially from any sections that directly address the question topic.`,
                        },
                    ],
                },
            ],
        };

        console.log("🤖 [AI GENERATION] Sending request to Gemini API...");
        console.log(
            "🤖 [AI GENERATION] Request body size:",
            JSON.stringify(requestBody).length,
            "characters"
        );

        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        console.log(
            "🤖 [AI RESPONSE] Response status:",
            response.status,
            response.statusText
        );
        console.log(
            "🤖 [AI RESPONSE] Response headers:",
            Object.fromEntries(response.headers.entries())
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ [AI ERROR] Gemini API error:", {
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText,
            });
            throw new Error(
                `Gemini API error: ${response.status} - ${errorText}`
            );
        }

        const geminiResponse = await response.json();
        console.log("🚀 ~ POST ~ geminiResponse:", geminiResponse);
        console.log("✅ [AI RESPONSE] Raw Gemini response received:");
        console.log("🤖 [AI RESPONSE] Response structure:", {
            hasCandidates: !!geminiResponse.candidates,
            candidatesCount: geminiResponse.candidates?.length || 0,
            hasContent: !!geminiResponse.candidates?.[0]?.content,
            hasText:
                !!geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text,
        });

        const responseContent =
            geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text ||
            "I couldn't generate a response.";

        console.log(
            "🤖 [AI RESPONSE] Generated response preview:",
            responseContent.substring(0, 200) + "..."
        );
        console.log(
            "🤖 [AI RESPONSE] Full response length:",
            responseContent.length,
            "characters"
        );

        // Extract confidence score from response if present
        const confidenceMatch = responseContent.match(
            /\*\*Confidence:\*\*\s*(\d+)%/
        );
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
        console.log(
            "📊 [AI RESPONSE] Extracted confidence score:",
            confidence + "%",
            confidenceMatch ? "(from response)" : "(default)"
        );

        // Identify sources mentioned in the response
        const mentionedSources = relevantDocs.filter((doc: any) =>
            responseContent.toLowerCase().includes(doc.title.toLowerCase())
        );
        console.log(
            "📚 [SOURCES] Documents mentioned in AI response:",
            mentionedSources.length,
            "out of",
            relevantDocs.length
        );
        mentionedSources.forEach((source, idx) => {
            console.log(`📚 [SOURCES] Mentioned ${idx + 1}: "${source.title}"`);
        }); // Filter and map sources to include validation info
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

        const finalSources =
            mentionedSources.length > 0
                ? formatSources(mentionedSources)
                : formatSources(relevantDocs.slice(0, 3));

        console.log("📋 [FINAL RESPONSE] Preparing final response...");
        console.log(
            "📋 [FINAL RESPONSE] Final sources count:",
            finalSources.length
        );
        finalSources.forEach((source, idx) => {
            console.log(
                `📋 [FINAL RESPONSE] Source ${idx + 1}: "${source.title}" (ID: ${source.id}, Valid: ${source.isValidId})`
            );
        });

        const finalResponse = {
            response: responseContent,
            sources: finalSources,
            confidence,
        };

        console.log(
            "🎉 [SUCCESS] Complete AI QA pipeline finished successfully!"
        );
        console.log("📊 [SUMMARY] Final response stats:", {
            responseLength: responseContent.length,
            sourcesCount: finalSources.length,
            confidence: confidence + "%",
            processingPipeline:
                "Pinecone → Text Extraction → AI Generation → Response",
        });

        return NextResponse.json(finalResponse);
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
