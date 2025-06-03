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
                try {
                    // Remove from Pinecone
                    await index.deleteOne(document._id);

                    return NextResponse.json({
                        success: true,
                        message: "Document deleted and removed from index",
                        documentId: document._id,
                    });
                } catch (error) {
                    console.error(
                        `Error removing document ${document._id} from index:`,
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
