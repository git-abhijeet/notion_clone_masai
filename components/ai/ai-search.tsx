"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Brain,
    Search,
    ExternalLink,
    AlertCircle,
    Database,
    RefreshCw,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Spinner from "@/components/spinner";
import { toast } from "sonner";
import { useDocumentIndexing } from "@/hooks/use-document-indexing";

interface AIAnswer {
    response: string;
    sources: Array<{ id: string; title: string; isValidId?: boolean }>;
    confidence: number;
}

export function AISearch() {
    const [query, setQuery] = useState("");
    const [answer, setAnswer] = useState<AIAnswer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [useVectorSearch, setUseVectorSearch] = useState(true);

    const allDocuments = useQuery(api.documents.getAllWithContent);
    const router = useRouter();
    const { isIndexing, indexDocuments } = useDocumentIndexing();
    const handleSearch = async (question: string) => {
        if (!question.trim()) return;

        setIsLoading(true);
        try {
            const response = await fetch("/api/ai/qa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question,
                    documents:
                        !useVectorSearch && allDocuments
                            ? allDocuments.map((doc) => ({
                                  _id: doc._id,
                                  title: doc.title,
                                  content: doc.content,
                              }))
                            : undefined,
                    useVectorSearch,
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

        await indexDocuments(allDocuments);
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
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-500" />
                    AI Workspace Assistant
                    <Badge variant="outline" className="ml-auto">
                        {useVectorSearch ? "Vector Search" : "Keyword Search"}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {" "}
                {/* Search Mode Controls */}
                <div className="flex items-center justify-between gap-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                            Search Mode:
                        </span>
                        <Button
                            variant={useVectorSearch ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUseVectorSearch(true)}
                        >
                            Vector Search
                        </Button>
                        <Button
                            variant={!useVectorSearch ? "default" : "outline"}
                            size="sm"
                            onClick={() => setUseVectorSearch(false)}
                        >
                            Keyword Search
                        </Button>
                    </div>{" "}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleIndexDocuments}
                        disabled={
                            isIndexing || allDocuments === undefined // Only disable if undefined, not if empty array
                        }
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
                                </span>
                                <Badge
                                    className={getConfidenceColor(
                                        answer.confidence
                                    )}
                                >
                                    {answer.confidence}%
                                </Badge>
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
            </CardContent>
        </Card>
    );
}
