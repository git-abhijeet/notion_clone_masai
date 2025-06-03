import { useState } from "react";
import { toast } from "sonner";

interface IndexDocumentParams {
    documentId: string;
    title: string;
    content: string;
    userId?: string;
}

export const useDocumentIndexing = () => {
    const [isIndexing, setIsIndexing] = useState(false);

    const indexDocument = async (params: IndexDocumentParams) => {
        try {
            const response = await fetch("/api/embeddings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params),
            });

            if (response.ok) {
                const result = await response.json();
                console.log(
                    "Document indexed successfully:",
                    result.documentId
                );
                return true;
            } else {
                console.error(
                    "Failed to index document:",
                    await response.text()
                );
                return false;
            }
        } catch (error) {
            console.error("Error indexing document:", error);
            return false;
        }
    };

    const removeDocumentIndex = async (documentId: string) => {
        try {
            const response = await fetch(
                `/api/embeddings?documentId=${documentId}`,
                {
                    method: "DELETE",
                }
            );

            if (response.ok) {
                console.log("Document index removed successfully:", documentId);
                return true;
            } else {
                console.error(
                    "Failed to remove document index:",
                    await response.text()
                );
                return false;
            }
        } catch (error) {
            console.error("Error removing document index:", error);
            return false;
        }
    };

    const bulkIndexDocuments = async (documents: any[], userId?: string) => {
        setIsIndexing(true);
        try {
            const response = await fetch("/api/embeddings/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documents, userId }),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(
                    `Successfully indexed ${result.successCount} documents`
                );
                if (result.errorCount > 0) {
                    toast.warning(
                        `${result.errorCount} documents failed to index`
                    );
                }
                return result;
            } else {
                const error = await response.json();
                toast.error(`Failed to index documents: ${error.error}`);
                return null;
            }
        } catch (error) {
            console.error("Bulk indexing error:", error);
            toast.error("Failed to index documents. Please try again.");
            return null;
        } finally {
            setIsIndexing(false);
        }
    };

    return {
        indexDocument,
        removeDocumentIndex,
        bulkIndexDocuments,
        isIndexing,
    };
};
