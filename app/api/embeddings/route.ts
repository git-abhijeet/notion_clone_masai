import { NextRequest, NextResponse } from "next/server";
import {
    getPineconeClient,
    PINECONE_INDEX_NAME,
    DocumentMetadata,
    formatDocumentId,
    isValidConvexId,
} from "@/lib/pinecone";
import { generateEmbedding, prepareTextForEmbedding } from "@/lib/embeddings";

export async function POST(req: NextRequest) {
    try {
        const { documentId, title, content, userId } = await req.json();

        if (!documentId || !title || !content) {
            return NextResponse.json(
                {
                    error: "Missing required fields: documentId, title, content",
                },
                { status: 400 }
            );
        }

        // Generate embedding for the document
        const textForEmbedding = prepareTextForEmbedding(title, content);
        const embedding = await generateEmbedding(textForEmbedding);

        // Get Pinecone client and index
        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME); // Check if documentId is a valid Convex ID
        const isConvexId = isValidConvexId(documentId);
        const formattedDocId = formatDocumentId(documentId);

        // Prepare metadata
        const metadata: DocumentMetadata = {
            documentId: formattedDocId,
            title,
            content: content.substring(0, 1000), // Store truncated content in metadata
            userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isConvexId, // Store whether this ID is a valid Convex ID
        };

        // Upsert vector to Pinecone
        await index.upsert([
            {
                id: formattedDocId, // Use the formatted ID
                values: embedding,
                metadata,
            },
        ]);

        return NextResponse.json({
            success: true,
            message: "Document embedded and stored successfully",
            documentId,
        });
    } catch (error) {
        console.error("Error storing embedding:", error);
        return NextResponse.json(
            {
                error: "Failed to store embedding",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const documentId = searchParams.get("documentId");

        if (!documentId) {
            return NextResponse.json(
                { error: "documentId is required" },
                { status: 400 }
            );
        }

        // Get Pinecone client and index
        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);

        // Delete vector from Pinecone
        await index.deleteOne(documentId);

        return NextResponse.json({
            success: true,
            message: "Document embedding deleted successfully",
            documentId,
        });
    } catch (error) {
        console.error("Error deleting embedding:", error);
        return NextResponse.json(
            {
                error: "Failed to delete embedding",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
