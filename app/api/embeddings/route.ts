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
    const requestStartTime = Date.now();

    try {
        const { documentId, title, content, userId } = await req.json();

        console.log("📝 [EMBEDDINGS] Starting document embedding pipeline");
        console.log("📝 [EMBEDDINGS] Request parameters:", {
            documentId,
            title: title?.substring(0, 50) + (title?.length > 50 ? "..." : ""),
            titleLength: title?.length,
            contentLength: content?.length,
            contentPreview:
                content?.substring(0, 100) +
                (content?.length > 100 ? "..." : ""),
            userId: userId || "No user ID",
            timestamp: new Date().toISOString(),
        });

        if (!documentId || !title || !content) {
            console.warn(
                "❌ [EMBEDDINGS] Validation failed - missing required fields:",
                {
                    hasDocumentId: !!documentId,
                    hasTitle: !!title,
                    hasContent: !!content,
                }
            );
            return NextResponse.json(
                {
                    error: "Missing required fields: documentId, title, content",
                },
                { status: 400 }
            );
        }

        // Generate embedding for the document
        console.log(
            "🔄 [EMBEDDING GENERATION] Preparing text for embedding..."
        );
        const textForEmbedding = prepareTextForEmbedding(title, content);
        console.log("🔄 [EMBEDDING GENERATION] Text prepared:", {
            originalContentLength: content.length,
            preparedTextLength: textForEmbedding.length,
            textPreview: textForEmbedding.substring(0, 150) + "...",
        });

        const embeddingStartTime = Date.now();
        const embedding = await generateEmbedding(textForEmbedding);
        const embeddingTime = Date.now() - embeddingStartTime;

        console.log(
            "✅ [EMBEDDING GENERATION] Embedding generated successfully:",
            {
                dimensions: embedding.length,
                processingTime: `${embeddingTime}ms`,
                firstFewDimensions: embedding
                    .slice(0, 5)
                    .map((d) => d.toFixed(4)),
                vectorMagnitude: Math.sqrt(
                    embedding.reduce((sum, val) => sum + val * val, 0)
                ).toFixed(4),
            }
        );

        // Get Pinecone client and index
        console.log(
            "📊 [PINECONE] Connecting to Pinecone for document storage..."
        );
        const pineconeStartTime = Date.now();
        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);
        const pineconeConnectionTime = Date.now() - pineconeStartTime;

        console.log("✅ [PINECONE] Connected successfully:", {
            indexName: PINECONE_INDEX_NAME,
            connectionTime: `${pineconeConnectionTime}ms`,
        });

        // Check if documentId is a valid Convex ID
        const isConvexId = isValidConvexId(documentId);
        const formattedDocId = formatDocumentId(documentId);

        console.log("🔄 [DOCUMENT PROCESSING] Processing document ID:", {
            originalId: documentId,
            formattedId: formattedDocId,
            isConvexId,
            idFormat: isConvexId ? "Convex ID" : "Custom ID",
        });

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

        console.log("🔄 [METADATA] Prepared document metadata:", {
            documentId: metadata.documentId,
            title: metadata.title?.substring(0, 50) + "...",
            contentTruncated: metadata.content.length,
            userId: metadata.userId,
            isConvexId: metadata.isConvexId,
            metadataSize: JSON.stringify(metadata).length,
        });

        // Upsert vector to Pinecone
        console.log("📊 [PINECONE UPSERT] Storing document vector...");
        const upsertStartTime = Date.now();

        await index.upsert([
            {
                id: formattedDocId, // Use the formatted ID
                values: embedding,
                metadata,
            },
        ]);

        const upsertTime = Date.now() - upsertStartTime;
        const totalTime = Date.now() - requestStartTime;

        console.log("✅ [PINECONE UPSERT] Document stored successfully:", {
            documentId: formattedDocId,
            upsertTime: `${upsertTime}ms`,
            vectorDimensions: embedding.length,
            metadataKeys: Object.keys(metadata).length,
        });

        console.log("✅ [EMBEDDINGS] Pipeline completed successfully:", {
            documentId,
            totalProcessingTime: `${totalTime}ms`,
            breakdown: {
                embeddingTime: `${embeddingTime}ms`,
                pineconeConnectionTime: `${pineconeConnectionTime}ms`,
                upsertTime: `${upsertTime}ms`,
                otherProcessingTime: `${totalTime - embeddingTime - pineconeConnectionTime - upsertTime}ms`,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Document embedded and stored successfully",
            documentId,
        });
    } catch (error) {
        const totalErrorTime = Date.now() - requestStartTime;

        console.error("❌ [EMBEDDINGS ERROR] Pipeline failed:", {
            error: error instanceof Error ? error.message : "Unknown error",
            errorType:
                error instanceof Error ? error.constructor.name : typeof error,
            processingTime: `${totalErrorTime}ms`,
            stack: error instanceof Error ? error.stack : undefined,
        });

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
    const requestStartTime = Date.now();

    try {
        const { searchParams } = new URL(req.url);
        const documentId = searchParams.get("documentId");

        console.log(
            "🗑️ [EMBEDDINGS DELETE] Starting document deletion pipeline"
        );
        console.log("🗑️ [EMBEDDINGS DELETE] Request parameters:", {
            documentId,
            timestamp: new Date().toISOString(),
            requestUrl: req.url,
        });

        if (!documentId) {
            console.warn(
                "❌ [EMBEDDINGS DELETE] Validation failed - missing documentId"
            );
            return NextResponse.json(
                { error: "documentId is required" },
                { status: 400 }
            );
        }

        // Get Pinecone client and index
        console.log(
            "📊 [PINECONE] Connecting to Pinecone for document deletion..."
        );
        const pineconeStartTime = Date.now();
        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);
        const pineconeConnectionTime = Date.now() - pineconeStartTime;

        console.log("✅ [PINECONE] Connected successfully:", {
            indexName: PINECONE_INDEX_NAME,
            connectionTime: `${pineconeConnectionTime}ms`,
        });

        // Delete vector from Pinecone
        console.log("🗑️ [PINECONE DELETE] Deleting document vector...");
        const deleteStartTime = Date.now();

        await index.deleteOne(documentId);

        const deleteTime = Date.now() - deleteStartTime;
        const totalTime = Date.now() - requestStartTime;

        console.log("✅ [PINECONE DELETE] Document deleted successfully:", {
            documentId,
            deleteTime: `${deleteTime}ms`,
            indexName: PINECONE_INDEX_NAME,
        });

        console.log("✅ [EMBEDDINGS DELETE] Pipeline completed successfully:", {
            documentId,
            totalProcessingTime: `${totalTime}ms`,
            breakdown: {
                pineconeConnectionTime: `${pineconeConnectionTime}ms`,
                deleteTime: `${deleteTime}ms`,
                otherProcessingTime: `${totalTime - pineconeConnectionTime - deleteTime}ms`,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Document embedding deleted successfully",
            documentId,
        });
    } catch (error) {
        const totalErrorTime = Date.now() - requestStartTime;

        console.error("❌ [EMBEDDINGS DELETE ERROR] Pipeline failed:", {
            documentId: new URL(req.url).searchParams.get("documentId"),
            error: error instanceof Error ? error.message : "Unknown error",
            errorType:
                error instanceof Error ? error.constructor.name : typeof error,
            processingTime: `${totalErrorTime}ms`,
            stack: error instanceof Error ? error.stack : undefined,
        });

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
