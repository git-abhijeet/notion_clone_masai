import { NextRequest, NextResponse } from "next/server";
import { getPineconeClient, PINECONE_INDEX_NAME } from "@/lib/pinecone";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
    const requestStartTime = Date.now();

    try {
        const { query, topK = 5, userId } = await req.json();

        console.log("🔍 [VECTOR SEARCH] Starting vector search pipeline");
        console.log("🔍 [VECTOR SEARCH] Request parameters:", {
            query:
                query?.substring(0, 100) + (query?.length > 100 ? "..." : ""),
            queryLength: query?.length,
            topK,
            userId: userId || "No user filter",
            timestamp: new Date().toISOString(),
        });

        if (!query) {
            console.warn(
                "❌ [VECTOR SEARCH] Query validation failed - empty query"
            );
            return NextResponse.json(
                { error: "Query is required" },
                { status: 400 }
            );
        }

        // Generate embedding for the search query
        console.log("🔄 [EMBEDDING] Generating embedding for search query...");
        const embeddingStartTime = Date.now();
        const queryEmbedding = await generateEmbedding(query);
        const embeddingTime = Date.now() - embeddingStartTime;

        console.log("✅ [EMBEDDING] Embedding generated successfully:", {
            dimensions: queryEmbedding.length,
            processingTime: `${embeddingTime}ms`,
            firstFewDimensions: queryEmbedding
                .slice(0, 5)
                .map((d) => d.toFixed(4)),
        });

        // Get Pinecone client and index
        console.log("📊 [PINECONE] Connecting to Pinecone database...");
        const pineconeStartTime = Date.now();
        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);
        const pineconeConnectionTime = Date.now() - pineconeStartTime;

        console.log("✅ [PINECONE] Connected to Pinecone successfully:", {
            indexName: PINECONE_INDEX_NAME,
            connectionTime: `${pineconeConnectionTime}ms`,
        });

        // Build filter for user-specific documents if userId is provided
        const filter = userId ? { userId: { $eq: userId } } : undefined;

        console.log("🔍 [PINECONE QUERY] Preparing search query:", {
            topK,
            hasFilter: !!filter,
            filterDetails: filter || "No filter applied",
            includeMetadata: true,
        });

        // Search for similar vectors
        console.log("🔍 [PINECONE QUERY] Executing vector search...");
        const searchStartTime = Date.now();
        const searchResults = await index.query({
            vector: queryEmbedding,
            topK,
            includeMetadata: true,
            filter,
        });
        const searchTime = Date.now() - searchStartTime;

        console.log("✅ [PINECONE RESPONSE] Raw search results received:", {
            totalMatches: searchResults.matches?.length || 0,
            searchTime: `${searchTime}ms`,
            namespace: searchResults.namespace || "default",
        });

        // Log detailed match information
        if (searchResults.matches && searchResults.matches.length > 0) {
            console.log("📊 [PINECONE STATS] Match statistics:");
            const scores = searchResults.matches.map((m) => m.score || 0);
            console.log({
                highestScore: Math.max(...scores).toFixed(4),
                lowestScore: Math.min(...scores).toFixed(4),
                averageScore: (
                    scores.reduce((a, b) => a + b, 0) / scores.length
                ).toFixed(4),
                scoresAbove0_8: scores.filter((s) => s > 0.8).length,
                scoresAbove0_6: scores.filter((s) => s > 0.6).length,
            });

            // Log each match details
            searchResults.matches.forEach((match, index) => {
                console.log(`📄 [DOCUMENT ${index + 1}] Match details:`, {
                    documentId: match.id,
                    score: match.score?.toFixed(4),
                    hasMetadata: !!match.metadata,
                    metadataKeys: match.metadata
                        ? Object.keys(match.metadata)
                        : [],
                    title:
                        typeof match.metadata?.title === 'string'
                            ? match.metadata.title.substring(0, 50) +
                              (match.metadata.title.length > 50 ? "..." : "")
                            : "No title",
                    contentPreview:
                        typeof match.metadata?.content === 'string'
                            ? match.metadata.content.substring(0, 100) +
                              (match.metadata.content.length > 100 ? "..." : "")
                            : "No content",
                });
            });
        } else {
            console.log("ℹ️ [PINECONE RESPONSE] No matches found for the query.");
        }

        const responseTime = Date.now() - requestStartTime;
        console.log("✅ [VECTOR SEARCH] Vector search pipeline completed:", {
            responseTime: `${responseTime}ms`,
        });

        return NextResponse.json(searchResults);
    } catch (error) {
        console.error("❌ [VECTOR SEARCH] Error in vector search pipeline:", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
