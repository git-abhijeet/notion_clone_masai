import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding, prepareTextForEmbedding } from "@/lib/embeddings";
import { getPineconeClient, PINECONE_INDEX_NAME } from "@/lib/pinecone";

export async function GET(req: NextRequest) {
    try {
        const testResults: any = {
            timestamp: new Date().toISOString(),
            tests: {},
            overall: "pending",
        };

        // Test 1: Gemini Embedding Generation
        try {
            const testText =
                "This is a test document about artificial intelligence and machine learning.";
            const embedding = await generateEmbedding(testText);

            testResults.tests.embeddingGeneration = {
                status: "success",
                details: {
                    inputLength: testText.length,
                    embeddingDimensions: embedding.length,
                    isValidDimensions: embedding.length === 768,
                },
            };
        } catch (error) {
            testResults.tests.embeddingGeneration = {
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }

        // Test 2: Pinecone Connection
        try {
            const pinecone = await getPineconeClient();
            const index = pinecone.index(PINECONE_INDEX_NAME);

            // Try to get index stats
            const stats = await index.describeIndexStats();

            testResults.tests.pineconeConnection = {
                status: "success",
                details: {
                    indexName: PINECONE_INDEX_NAME,
                    totalVectors: stats.totalRecordCount || 0,
                    dimension: stats.dimension,
                },
            };
        } catch (error) {
            testResults.tests.pineconeConnection = {
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }

        // Test 3: End-to-End Vector Operations (if previous tests passed)
        if (
            testResults.tests.embeddingGeneration?.status === "success" &&
            testResults.tests.pineconeConnection?.status === "success"
        ) {
            try {
                const pinecone = await getPineconeClient();
                const index = pinecone.index(PINECONE_INDEX_NAME);

                // Create test document
                const testDoc = {
                    id: "test-doc-" + Date.now(),
                    title: "Test Document",
                    content:
                        "This is a comprehensive test document about vector search capabilities in our Notion clone application.",
                };

                // Generate embedding
                const textForEmbedding = prepareTextForEmbedding(
                    testDoc.title,
                    testDoc.content
                );
                const embedding = await generateEmbedding(textForEmbedding);

                // Upsert to Pinecone
                await index.upsert([
                    {
                        id: testDoc.id,
                        values: embedding,
                        metadata: {
                            documentId: testDoc.id,
                            title: testDoc.title,
                            content: testDoc.content,
                            isTestDocument: true,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                        },
                    },
                ]);

                // Wait a moment for indexing
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Search for similar content
                const searchQuery = "vector search in notion application";
                const queryEmbedding = await generateEmbedding(searchQuery);

                const searchResults = await index.query({
                    vector: queryEmbedding,
                    topK: 5,
                    includeMetadata: true,
                    filter: { isTestDocument: { $eq: true } },
                });

                // Clean up test document
                await index.deleteOne(testDoc.id);

                testResults.tests.endToEndVectorOps = {
                    status: "success",
                    details: {
                        testDocumentId: testDoc.id,
                        searchQuery: searchQuery,
                        searchResultsCount: searchResults.matches?.length || 0,
                        highestScore: searchResults.matches?.[0]?.score || 0,
                        cleanupCompleted: true,
                    },
                };
            } catch (error) {
                testResults.tests.endToEndVectorOps = {
                    status: "failed",
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                };
            }
        } else {
            testResults.tests.endToEndVectorOps = {
                status: "skipped",
                reason: "Previous tests failed",
            };
        }

        // Determine overall status
        const testStatuses = Object.values(testResults.tests).map(
            (test: any) => test.status
        );
        const failedTests = testStatuses.filter(
            (status) => status === "failed"
        ).length;
        const successfulTests = testStatuses.filter(
            (status) => status === "success"
        ).length;

        if (failedTests === 0) {
            testResults.overall = "success";
        } else if (successfulTests > 0) {
            testResults.overall = "partial";
        } else {
            testResults.overall = "failed";
        }

        testResults.summary = {
            totalTests: testStatuses.length,
            successful: successfulTests,
            failed: failedTests,
            skipped: testStatuses.filter((status) => status === "skipped")
                .length,
        };

        return NextResponse.json(testResults);
    } catch (error) {
        console.error("Test endpoint error:", error);
        return NextResponse.json(
            {
                error: "Failed to run tests",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
