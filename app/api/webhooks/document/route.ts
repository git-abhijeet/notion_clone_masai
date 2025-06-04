import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding, prepareTextForEmbedding } from "@/lib/embeddings";
import {
    getPineconeClient,
    PINECONE_INDEX_NAME,
    DocumentMetadata,
} from "@/lib/pinecone";

interface DocumentWebhookPayload {
    action: "created" | "updated" | "deleted";
    document: {
        _id: string;
        title: string;
        content: string;
        userId?: string;
        _creationTime?: number;
    };
}

export async function POST(req: NextRequest) {
    try {
        const { action, document }: DocumentWebhookPayload = await req.json();

        if (!action || !document || !document._id) {
            return NextResponse.json(
                { error: "Invalid webhook payload" },
                { status: 400 }
            );
        }

        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);

        switch (action) {
            case "created":
            case "updated":
                // Index or update the document
                if (!document.title || !document.content) {
                    return NextResponse.json({
                        success: true,
                        message: "Document skipped - missing title or content",
                        documentId: document._id,
                    });
                }

                try {
                    // Generate embedding
                    const textForEmbedding = prepareTextForEmbedding(
                        document.title,
                        document.content
                    );
                    const embedding = await generateEmbedding(textForEmbedding);

                    // Prepare metadata
                    const metadata: DocumentMetadata = {
                        documentId: document._id,
                        title: document.title,
                        content: document.content.substring(0, 1000),
                        userId: document.userId,
                        createdAt: document._creationTime
                            ? new Date(document._creationTime).toISOString()
                            : new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };

                    // Upsert to Pinecone
                    await index.upsert([
                        {
                            id: document._id,
                            values: embedding,
                            metadata,
                        },
                    ]);

                    return NextResponse.json({
                        success: true,
                        message: `Document ${action} and indexed successfully`,
                        documentId: document._id,
                    });
                } catch (error) {
                    console.error(
                        `Error indexing document ${document._id}:`,
                        error
                    );
                    return NextResponse.json({
                        success: false,
                        message: `Document ${action} but indexing failed`,
                        documentId: document._id,
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    });
                }
            case "deleted":
                console.log(
                    "🗑️ [WEBHOOK DELETE] Starting document deletion process:",
                    {
                        documentId: document._id,
                        documentTitle: document.title,
                        timestamp: new Date().toISOString(),
                    }
                );

                try {
                    // Log index stats before deletion
                    const statsBefore = await index.describeIndexStats();
                    console.log(
                        "📊 [PINECONE STATS] Index stats before deletion:",
                        {
                            totalVectors: statsBefore.totalRecordCount || 0,
                            documentIdToDelete: document._id,
                        }
                    );

                    // Remove from Pinecone
                    console.log(
                        "🗑️ [PINECONE DELETE] Attempting to delete vector with ID:",
                        document._id
                    );
                    await index.deleteOne(document._id);

                    // Verify deletion by trying to fetch the deleted document
                    try {
                        const fetchResult = await index.fetch([document._id]);
                        console.log(
                            "🔍 [PINECONE VERIFY] Post-deletion fetch result:",
                            {
                                documentId: document._id,
                                vectorExists:
                                    !!fetchResult.records[document._id],
                                fetchKeys: Object.keys(fetchResult.records),
                            }
                        );
                    } catch (fetchError) {
                        console.log(
                            "🔍 [PINECONE VERIFY] Could not fetch deleted document (expected):",
                            fetchError
                        );
                    }

                    // Log index stats after deletion
                    const statsAfter = await index.describeIndexStats();
                    console.log(
                        "📊 [PINECONE STATS] Index stats after deletion:",
                        {
                            totalVectors: statsAfter.totalRecordCount || 0,
                            vectorsRemoved:
                                (statsBefore.totalRecordCount || 0) -
                                (statsAfter.totalRecordCount || 0),
                        }
                    );

                    console.log(
                        "✅ [WEBHOOK DELETE] Document deletion completed successfully"
                    );
                    return NextResponse.json({
                        success: true,
                        message: "Document deleted and removed from index",
                        documentId: document._id,
                    });
                } catch (error) {
                    console.error(
                        `❌ [WEBHOOK DELETE ERROR] Error removing document ${document._id} from index:`,
                        error
                    );
                    return NextResponse.json({
                        success: false,
                        message:
                            "Document deleted but removal from index failed",
                        documentId: document._id,
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    });
                }

            default:
                return NextResponse.json(
                    { error: `Unsupported action: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error("Document webhook error:", error);
        return NextResponse.json(
            {
                error: "Failed to process document webhook",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
