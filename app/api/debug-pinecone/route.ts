import { NextRequest, NextResponse } from "next/server";
import { getPineconeClient, PINECONE_INDEX_NAME } from "@/lib/pinecone";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get("action");
        const documentId = searchParams.get("documentId");

        const pinecone = await getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);

        switch (action) {
            case "stats":
                const stats = await index.describeIndexStats();
                return NextResponse.json({
                    success: true,
                    data: {
                        totalVectors: stats.totalRecordCount || 0,
                        dimensions: stats.dimension,
                        namespaces: stats.namespaces,
                    },
                });
            case "list":
                // List some vectors (limited by Pinecone's query capabilities)
                const listResult = await index.query({
                    vector: new Array(768).fill(0), // Dummy vector for listing (768 dimensions)
                    topK: 50,
                    includeMetadata: true,
                });
                return NextResponse.json({
                    success: true,
                    data: {
                        matches:
                            listResult.matches?.map((match) => ({
                                id: match.id,
                                score: match.score,
                                title: match.metadata?.title,
                                documentId: match.metadata?.documentId,
                            })) || [],
                        totalFound: listResult.matches?.length || 0,
                    },
                });

            case "fetch":
                if (!documentId) {
                    return NextResponse.json({
                        success: false,
                        error: "documentId required for fetch action",
                    });
                }

                const fetchResult = await index.fetch([documentId]);
                return NextResponse.json({
                    success: true,
                    data: {
                        documentId,
                        exists: !!fetchResult.records[documentId],
                        metadata: fetchResult.records[documentId]?.metadata,
                        foundRecords: Object.keys(fetchResult.records),
                    },
                });

            case "delete":
                if (!documentId) {
                    return NextResponse.json({
                        success: false,
                        error: "documentId required for delete action",
                    });
                }

                console.log(
                    "🧪 [DEBUG DELETE] Attempting to delete document:",
                    documentId
                );
                await index.deleteOne(documentId);
                console.log(
                    "✅ [DEBUG DELETE] Document deleted successfully:",
                    documentId
                );

                // Verify deletion
                const verifyResult = await index.fetch([documentId]);
                return NextResponse.json({
                    success: true,
                    data: {
                        documentId,
                        deletedSuccessfully: !verifyResult.records[documentId],
                        message: "Document deletion completed",
                    },
                });

            default:
                return NextResponse.json({
                    success: false,
                    error: "Invalid action. Use: stats, list, fetch, or delete",
                    examples: [
                        "/api/debug-pinecone?action=stats",
                        "/api/debug-pinecone?action=list",
                        "/api/debug-pinecone?action=fetch&documentId=YOUR_DOC_ID",
                        "/api/debug-pinecone?action=delete&documentId=YOUR_DOC_ID",
                    ],
                });
        }
    } catch (error) {
        console.error("Debug Pinecone error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
