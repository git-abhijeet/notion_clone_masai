import { useState } from "react";
import { toast } from "sonner";

interface IndexingResult {
    success: boolean;
    message: string;
    successCount: number;
    errorCount: number;
    results: Array<{ documentId: string; status: string; title: string }>;
    errors: Array<{ documentId: string; error: string }>;
}

export function useDocumentIndexing() {
    const [isIndexing, setIsIndexing] = useState(false);
    const [indexingProgress, setIndexingProgress] = useState(0);

    const indexDocuments = async (
        documents: any[]
    ): Promise<IndexingResult | null> => {
        if (!documents || documents.length === 0) {
            toast.error("No documents found to index");
            return null;
        }

        setIsIndexing(true);
        setIndexingProgress(0);

        try {
            const response = await fetch("/api/embeddings/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    documents: documents.map((doc) => ({
                        _id: doc._id,
                        title: doc.title,
                        content: doc.content,
                        userId: doc.userId,
                        createdAt: doc._creationTime,
                        updatedAt: doc._creationTime,
                    })),
                }),
            });

            if (response.ok) {
                const result: IndexingResult = await response.json();
                toast.success(
                    `Successfully indexed ${result.successCount} documents`
                );

                if (result.errorCount > 0) {
                    toast.warning(
                        `${result.errorCount} documents failed to index`
                    );
                }

                setIndexingProgress(100);
                return result;
            } else {
                const error = await response.json();
                toast.error(`Failed to index documents: ${error.error}`);
                return null;
            }
        } catch (error) {
            console.error("Indexing error:", error);
            toast.error("Failed to index documents. Please try again.");
            return null;
        } finally {
            setIsIndexing(false);
            setIndexingProgress(0);
        }
    };

    const indexSingleDocument = async (document: any): Promise<boolean> => {
        if (
            !document ||
            !document._id ||
            !document.title ||
            !document.content
        ) {
            toast.error("Invalid document data");
            return false;
        }

        try {
            const response = await fetch("/api/embeddings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    documentId: document._id,
                    title: document.title,
                    content: document.content,
                    userId: document.userId,
                    createdAt: document._creationTime,
                    updatedAt: document._creationTime,
                }),
            });

            if (response.ok) {
                toast.success(
                    `Document "${document.title}" indexed successfully`
                );
                return true;
            } else {
                const error = await response.json();
                toast.error(`Failed to index document: ${error.error}`);
                return false;
            }
        } catch (error) {
            console.error("Single document indexing error:", error);
            toast.error("Failed to index document");
            return false;
        }
    };

    return {
        isIndexing,
        indexingProgress,
        indexDocuments,
        indexSingleDocument,
    };
}
