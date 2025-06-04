"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Brain,
    Search,
    ExternalLink,
    AlertCircle,
    Database,
    RefreshCw,
    Trash2,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Spinner from "@/components/spinner";
import { toast } from "sonner";
import { useDocumentIndexing } from "@/hooks/use-document-indexing";
import { usePineconeCleanup } from "@/hooks/use-pinecone-cleanup";

interface AIAnswer {
    response: string;
    sources: Array<{ id: string; title: string; isValidId?: boolean }>;
    confidence: number;
}

export function AISearch() {
    const [query, setQuery] = useState("");
    const [answer, setAnswer] = useState<AIAnswer | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const allDocuments = useQuery(api.documents.getAllWithContent);
    const router = useRouter();
    const { isIndexing, bulkIndexDocuments } = useDocumentIndexing();
    const { bulkCleanupOrphanedDocuments, isCleaningUp } = usePineconeCleanup();
    const handleSearch = async (question: string) => {
        if (!question.trim()) return;

        setIsLoading(true);
        try {
            const response = await fetch("/api/ai/qa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                setAnswer(result);
            } else {
                setAnswer({
                    response:
                        "Sorry, I encountered an error while processing your question.",
                    sources: [],
                    confidence: 0,
                });
            }
        } catch (error) {
            console.error("AI search error:", error);
            setAnswer({
                response:
                    "Sorry, I encountered an error while searching. Please try again.",
                sources: [],
                confidence: 0,
            });
        } finally {
            setIsLoading(false);
        }
    };
    const handleIndexDocuments = async () => {
        if (allDocuments === undefined) {
            toast.error("Document data is still loading");
            return;
        }

        if (allDocuments.length === 0) {
            toast.warning(
                "No documents available to index. Try creating some documents first."
            );
            return;
        }

        console.log("Starting indexing with documents:", {
            count: allDocuments.length,
            firstDoc: allDocuments[0],
        });

        try {
            await bulkIndexDocuments(allDocuments);
            console.log("Indexing completed successfully");
        } catch (error) {
            console.error("Indexing error:", error);
            toast.error(
                "Failed to index documents. Check console for details."
            );
        }
    };

    const handleCleanupOrphaned = async () => {
        if (!allDocuments) {
            toast.error("Documents not loaded yet");
            return;
        }

        console.log("Starting cleanup with documents:", {
            count: allDocuments.length,
            firstDoc: allDocuments[0],
        });

        try {
            const validDocumentIds = allDocuments.map((doc) => doc._id);
            await bulkCleanupOrphanedDocuments(validDocumentIds);
            console.log("Cleanup completed successfully");
        } catch (error) {
            console.error("Cleanup error:", error);
            toast.error(
                "Failed to cleanup orphaned documents. Check console for details."
            );
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 80)
            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
        if (confidence >= 60)
            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    };
    return (
        <Card className="w-full max-w-3xl mx-auto">
            {" "}
            <CardHeader>
                {" "}
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-blue-500" />
                        AI Workspace Assistant
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCleanupOrphaned}
                            disabled={
                                isCleaningUp || allDocuments === undefined
                            }
                        >
                            {isCleaningUp ? (
                                <>
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                    Cleaning...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Clean Orphaned
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleIndexDocuments}
                            disabled={isIndexing || allDocuments === undefined}
                        >
                            {isIndexing ? (
                                <>
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                    Indexing...
                                </>
                            ) : (
                                <>
                                    <Database className="w-3 h-3 mr-1" />
                                    Index Documents
                                </>
                            )}
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>{" "}
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        placeholder="Ask anything about your workspace..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && handleSearch(query)
                        }
                        className="flex-1"
                    />
                    <Button
                        onClick={() => handleSearch(query)}
                        disabled={isLoading || !query.trim()}
                    >
                        {isLoading ? (
                            <Spinner size="sm" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </Button>
                </div>
                {answer && (
                    <div className="mt-6 space-y-4">
                        {/* Confidence Score */}
                        {typeof answer.confidence === "number" && (
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Confidence:
                                </span>{" "}
                                <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(
                                        answer.confidence
                                    )}`}
                                >
                                    {answer.confidence}%
                                </span>
                            </div>
                        )}
                        {/* Answer */}
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="prose dark:prose-invert max-w-none">
                                <div className="text-sm whitespace-pre-wrap">
                                    {answer.response}
                                </div>
                            </div>
                        </div>{" "}
                        {/* Sources */}
                        {answer.sources && answer.sources.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground">
                                    Referenced Documents:
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {answer.sources.map((source, index) => {
                                        // Check if ID is a valid Convex ID using the flag from the API or fall back to regex
                                        const isValidConvexId =
                                            source.isValidId !== undefined
                                                ? source.isValidId
                                                : /^[a-zA-Z0-9_-]{20,}$/.test(
                                                      source.id
                                                  );

                                        return (
                                            <Button
                                                key={index}
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs"
                                                onClick={() => {
                                                    if (isValidConvexId) {
                                                        router.push(
                                                            `/documents/${source.id}`
                                                        );
                                                    } else {
                                                        // For non-Convex IDs, show a toast with the document title
                                                        toast.error(
                                                            `Cannot open document: "${source.title}". The document ID format is not compatible.`
                                                        );
                                                    }
                                                }}
                                            >
                                                <ExternalLink className="w-3 h-3 mr-1" />
                                                {source.title}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {/* Debug Section - Only show in development */}
                {process.env.NODE_ENV === "development" && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                            Debug Tools
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    window.open(
                                        "/api/debug-pinecone?action=stats",
                                        "_blank"
                                    )
                                }
                            >
                                Pinecone Stats
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    window.open(
                                        "/api/debug-pinecone?action=list",
                                        "_blank"
                                    )
                                }
                            >
                                List Index
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
