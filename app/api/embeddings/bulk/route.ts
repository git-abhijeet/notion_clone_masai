import { NextRequest, NextResponse } from "next/server";
import {
    getPineconeClient,
    PINECONE_INDEX_NAME,
    DocumentMetadata,
} from "@/lib/pinecone";
import { generateEmbedding, prepareTextForEmbedding } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
    try {
        const { documents, userId } = await req.json();
        if (!documents || !Array.isArray(documents)) {
            return NextResponse.json(
                { error: "Documents array is required" },
                { status: 400 }
            );
        }

        const results: Array<{
            documentId: string;
            status: string;
            title: string;
        }> = [];
        const errors: Array<{ documentId: string; error: string }> = [];

        // Get Pinecone client and index
        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);

        // Process documents in batches to avoid overwhelming the API
        const batchSize = 5;

        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const batchVectors = [];

            for (const doc of batch) {
                try {
                    if (!doc._id || !doc.title || !doc.content) {
                        errors.push({
                            documentId: doc._id || "unknown",
                            error: "Missing required fields: _id, title, content",
                        });
                        continue;
                    }

                    // Generate embedding for the document
                    const textForEmbedding = prepareTextForEmbedding(
                        doc.title,
                        doc.content
                    );
                    const embedding = await generateEmbedding(textForEmbedding);

                    // Prepare metadata
                    const metadata: DocumentMetadata = {
                        documentId: doc._id,
                        title: doc.title,
                        content: doc.content.substring(0, 1000), // Store truncated content
                        userId: userId || doc.userId,
                        createdAt: doc.createdAt || new Date().toISOString(),
                        updatedAt: doc.updatedAt || new Date().toISOString(),
                    };

                    batchVectors.push({
                        id: doc._id,
                        values: embedding,
                        metadata,
                    });

                    results.push({
                        documentId: doc._id,
                        status: "success",
                        title: doc.title,
                    });
                } catch (error) {
                    console.error(
                        `Error processing document ${doc._id}:`,
                        error
                    );
                    errors.push({
                        documentId: doc._id,
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    });
                }
            }

            // Upsert batch to Pinecone
            if (batchVectors.length > 0) {
                try {
                    await index.upsert(batchVectors);
                    console.log(
                        `Successfully indexed batch of ${batchVectors.length} documents`
                    );
                } catch (error) {
                    console.error("Error upserting batch to Pinecone:", error);
                    // Mark all documents in this batch as failed
                    batchVectors.forEach((vector) => {
                        const successIndex = results.findIndex(
                            (r) => r.documentId === vector.id
                        );
                        if (successIndex >= 0) {
                            results[successIndex].status = "failed";
                            errors.push({
                                documentId: vector.id,
                                error: "Failed to upsert to Pinecone",
                            });
                        }
                    });
                }
            }

            // Small delay between batches to be respectful to the APIs
            if (i + batchSize < documents.length) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        return NextResponse.json({
            success: true,
            message: `Indexed ${results.filter((r) => r.status === "success").length} documents`,
            results,
            errors,
            totalProcessed: documents.length,
            successCount: results.filter((r) => r.status === "success").length,
            errorCount: errors.length,
        });
    } catch (error) {
        console.error("Error bulk indexing documents:", error);
        return NextResponse.json(
            {
                error: "Failed to bulk index documents",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
