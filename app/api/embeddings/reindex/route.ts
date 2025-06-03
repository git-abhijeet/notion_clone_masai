import { NextRequest, NextResponse } from "next/server";
import { getPineconeClient, PINECONE_INDEX_NAME } from "@/lib/pinecone";
import { generateEmbedding, prepareTextForEmbedding } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
    try {
        const { documents } = await req.json();

        if (!documents || !Array.isArray(documents)) {
            return NextResponse.json(
                { error: "Documents array is required" },
                { status: 400 }
            );
        }

        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);

        const results = [];
        let successCount = 0;
        let failCount = 0;

        console.log(`Starting re-indexing of ${documents.length} documents...`);

        for (const doc of documents) {
            try {
                if (!doc.documentId || !doc.title || !doc.content) {
                    console.warn(
                        `Skipping document with missing fields:`,
                        doc.documentId
                    );
                    failCount++;
                    continue;
                }

                // Generate embedding with improved text extraction
                const textForEmbedding = prepareTextForEmbedding(
                    doc.title,
                    doc.content
                );
                const embedding = await generateEmbedding(textForEmbedding);

                // Prepare metadata with extracted text for storage
                const metadata = {
                    documentId: doc.documentId,
                    title: doc.title,
                    content: textForEmbedding.substring(0, 1500), // Store processed text
                    userId: doc.userId,
                    createdAt: doc.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                // Upsert vector to Pinecone (this will overwrite existing vectors with same ID)
                await index.upsert([
                    {
                        id: doc.documentId,
                        values: embedding,
                        metadata,
                    },
                ]);

                console.log(`✅ Re-indexed: ${doc.title}`);
                successCount++;

                // Add a small delay to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
                console.error(
                    `❌ Failed to re-index document ${doc.documentId}:`,
                    error
                );
                failCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Re-indexing complete: ${successCount} successful, ${failCount} failed`,
            results: {
                total: documents.length,
                successful: successCount,
                failed: failCount,
            },
        });
    } catch (error) {
        console.error("Error during re-indexing:", error);
        return NextResponse.json(
            {
                error: "Failed to re-index documents",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
