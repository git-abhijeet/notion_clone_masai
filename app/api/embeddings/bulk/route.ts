import { NextRequest, NextResponse } from "next/server";
import {
    getPineconeClient,
    PINECONE_INDEX_NAME,
    DocumentMetadata,
} from "@/lib/pinecone";
import { generateEmbedding, prepareTextForEmbedding } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
    const requestStartTime = Date.now();

    try {
        const { documents, userId } = await req.json();

        console.log(
            "📦 [BULK EMBEDDINGS] Starting bulk document embedding pipeline"
        );
        console.log("📦 [BULK EMBEDDINGS] Request parameters:", {
            documentsCount: documents?.length || 0,
            userId: userId || "No user ID provided",
            timestamp: new Date().toISOString(),
        });

        if (!documents || !Array.isArray(documents)) {
            console.warn(
                "❌ [BULK EMBEDDINGS] Validation failed - invalid documents array"
            );
            return NextResponse.json(
                { error: "Documents array is required" },
                { status: 400 }
            );
        }

        console.log("📊 [BULK EMBEDDINGS] Document analysis:", {
            totalDocuments: documents.length,
            validDocuments: documents.filter(
                (doc) => doc._id && doc.title && doc.content
            ).length,
            averageContentLength:
                documents.length > 0
                    ? Math.round(
                          documents.reduce(
                              (sum, doc) => sum + (doc.content?.length || 0),
                              0
                          ) / documents.length
                      )
                    : 0,
            documentsWithoutIds: documents.filter((doc) => !doc._id).length,
            documentsWithoutTitles: documents.filter((doc) => !doc.title)
                .length,
            documentsWithoutContent: documents.filter((doc) => !doc.content)
                .length,
        });

        const results: Array<{
            documentId: string;
            status: string;
            title: string;
        }> = [];
        const errors: Array<{ documentId: string; error: string }> = [];

        // Get Pinecone client and index
        console.log(
            "📊 [PINECONE] Connecting to Pinecone for bulk operations..."
        );
        const pineconeStartTime = Date.now();
        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);
        const pineconeConnectionTime = Date.now() - pineconeStartTime;

        console.log("✅ [PINECONE] Connected successfully:", {
            indexName: PINECONE_INDEX_NAME,
            connectionTime: `${pineconeConnectionTime}ms`,
        });

        // Process documents in batches to avoid overwhelming the API
        const batchSize = 5;
        const totalBatches = Math.ceil(documents.length / batchSize);

        console.log("🔄 [BULK PROCESSING] Starting batch processing:", {
            batchSize,
            totalBatches,
            estimatedProcessingTime: `${totalBatches * 2}s (approx)`,
        });

        for (let i = 0; i < documents.length; i += batchSize) {
            const batchNumber = Math.floor(i / batchSize) + 1;
            const batchStartTime = Date.now();

            console.log(
                `📦 [BATCH ${batchNumber}/${totalBatches}] Processing batch ${batchNumber}...`
            );

            const batch = documents.slice(i, i + batchSize);
            const batchVectors = [];

            for (const doc of batch) {
                try {
                    if (!doc._id || !doc.title || !doc.content) {
                        console.warn(
                            `❌ [BATCH ${batchNumber}] Document validation failed:`,
                            {
                                documentId: doc._id || "unknown",
                                hasId: !!doc._id,
                                hasTitle: !!doc.title,
                                hasContent: !!doc.content,
                            }
                        );

                        errors.push({
                            documentId: doc._id || "unknown",
                            error: "Missing required fields: _id, title, content",
                        });
                        continue;
                    }

                    console.log(
                        `🔄 [BATCH ${batchNumber}] Processing document:`,
                        {
                            documentId: doc._id,
                            title:
                                doc.title.substring(0, 50) +
                                (doc.title.length > 50 ? "..." : ""),
                            contentLength: doc.content.length,
                        }
                    );

                    // Generate embedding for the document
                    const textForEmbedding = prepareTextForEmbedding(
                        doc.title,
                        doc.content
                    );

                    const embeddingStartTime = Date.now();
                    const embedding = await generateEmbedding(textForEmbedding);
                    const embeddingTime = Date.now() - embeddingStartTime;

                    console.log(
                        `✅ [BATCH ${batchNumber}] Embedding generated:`,
                        {
                            documentId: doc._id,
                            dimensions: embedding.length,
                            embeddingTime: `${embeddingTime}ms`,
                            textLength: textForEmbedding.length,
                        }
                    );

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
                        `❌ [BATCH ${batchNumber}] Document processing failed:`,
                        {
                            documentId: doc._id,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : "Unknown error",
                            errorType:
                                error instanceof Error
                                    ? error.constructor.name
                                    : typeof error,
                        }
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
                    console.log(
                        `📊 [BATCH ${batchNumber}] Upserting ${batchVectors.length} vectors to Pinecone...`
                    );
                    const upsertStartTime = Date.now();

                    await index.upsert(batchVectors);

                    const upsertTime = Date.now() - upsertStartTime;
                    const batchTime = Date.now() - batchStartTime;

                    console.log(
                        `✅ [BATCH ${batchNumber}] Successfully indexed batch:`,
                        {
                            vectorCount: batchVectors.length,
                            upsertTime: `${upsertTime}ms`,
                            totalBatchTime: `${batchTime}ms`,
                            documentsPerSecond: Math.round(
                                batchVectors.length / (batchTime / 1000)
                            ),
                        }
                    );
                } catch (error) {
                    console.error(
                        `❌ [BATCH ${batchNumber}] Pinecone upsert failed:`,
                        {
                            error:
                                error instanceof Error
                                    ? error.message
                                    : "Unknown error",
                            errorType:
                                error instanceof Error
                                    ? error.constructor.name
                                    : typeof error,
                            affectedDocuments: batchVectors.length,
                        }
                    );

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
            } else {
                console.warn(
                    `⚠️ [BATCH ${batchNumber}] No valid vectors to upsert in this batch`
                );
            }

            // Small delay between batches to be respectful to the APIs
            if (i + batchSize < documents.length) {
                console.log(
                    `⏱️ [BATCH ${batchNumber}] Waiting 1s before next batch...`
                );
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        const totalTime = Date.now() - requestStartTime;
        const successCount = results.filter(
            (r) => r.status === "success"
        ).length;
        const finalResponse = {
            success: true,
            message: `Indexed ${successCount} documents`,
            results,
            errors,
            totalProcessed: documents.length,
            successCount,
            errorCount: errors.length,
        };

        console.log("✅ [BULK EMBEDDINGS] Pipeline completed:", {
            totalDocuments: documents.length,
            successCount,
            errorCount: errors.length,
            successRate: `${((successCount / documents.length) * 100).toFixed(1)}%`,
            totalProcessingTime: `${totalTime}ms`,
            averageTimePerDocument: `${Math.round(totalTime / documents.length)}ms`,
            responseSize: JSON.stringify(finalResponse).length,
        });

        return NextResponse.json(finalResponse);
    } catch (error) {
        const totalErrorTime = Date.now() - requestStartTime;

        console.error("❌ [BULK EMBEDDINGS ERROR] Pipeline failed:", {
            error: error instanceof Error ? error.message : "Unknown error",
            errorType:
                error instanceof Error ? error.constructor.name : typeof error,
            processingTime: `${totalErrorTime}ms`,
            stack: error instanceof Error ? error.stack : undefined,
        });

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
