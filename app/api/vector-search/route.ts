import { NextRequest, NextResponse } from "next/server";
import { getPineconeClient, PINECONE_INDEX_NAME } from "@/lib/pinecone";
import { generateEmbedding } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
    try {
        const { query, topK = 5, userId } = await req.json();

        if (!query) {
            return NextResponse.json(
                { error: "Query is required" },
                { status: 400 }
            );
        }

        // Generate embedding for the search query
        const queryEmbedding = await generateEmbedding(query);

        // Get Pinecone client and index
        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);

        // Build filter for user-specific documents if userId is provided
        const filter = userId ? { userId: { $eq: userId } } : undefined;

        // Search for similar vectors
        const searchResults = await index.query({
            vector: queryEmbedding,
            topK,
            includeMetadata: true,
            filter,
        });

        // Format results
        const results =
            searchResults.matches?.map((match) => ({
                documentId: match.id,
                score: match.score,
                metadata: match.metadata,
            })) || [];

        return NextResponse.json({
            success: true,
            query,
            results,
            totalResults: results.length,
        });
    } catch (error) {
        console.error("Error performing vector search:", error);
        return NextResponse.json(
            {
                error: "Failed to perform vector search",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
