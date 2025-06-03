import { useEffect, useRef } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface Document {
    _id: Id<"documents">;
    title: string;
    content?: string;
    userId: string;
    _creationTime: number;
}

interface UseAutoIndexingOptions {
    enabled?: boolean;
    debounceMs?: number;
}

export function useAutoIndexing(
    document: Document | null,
    options: UseAutoIndexingOptions = {}
) {
    const { enabled = true, debounceMs = 2000 } = options;
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastIndexedRef = useRef<string>("");

    useEffect(() => {
        if (!enabled || !document || !document.content) {
            return;
        }

        // Create a hash of the document content to check if it changed
        const contentHash = `${document.title}:${document.content}`;

        // Don't reindex if content hasn't changed
        if (contentHash === lastIndexedRef.current) {
            return;
        }

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Debounce the indexing operation
        timeoutRef.current = setTimeout(async () => {
            try {
                const response = await fetch("/api/webhooks/document", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "updated",
                        document: {
                            _id: document._id,
                            title: document.title,
                            content: document.content,
                            userId: document.userId,
                            _creationTime: document._creationTime,
                        },
                    }),
                });

                if (response.ok) {
                    lastIndexedRef.current = contentHash;
                    console.log(
                        `Document ${document._id} auto-indexed successfully`
                    );
                } else {
                    console.error(
                        "Auto-indexing failed:",
                        await response.text()
                    );
                }
            } catch (error) {
                console.error("Auto-indexing error:", error);
            }
        }, debounceMs);

        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [document, enabled, debounceMs]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
}

// Hook for manual indexing operations
export function useManualIndexing() {
    const indexDocument = async (document: Document): Promise<boolean> => {
        try {
            const response = await fetch("/api/webhooks/document", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "updated",
                    document: {
                        _id: document._id,
                        title: document.title,
                        content: document.content,
                        userId: document.userId,
                        _creationTime: document._creationTime,
                    },
                }),
            });

            return response.ok;
        } catch (error) {
            console.error("Manual indexing error:", error);
            return false;
        }
    };

    const deleteDocumentIndex = async (
        documentId: string
    ): Promise<boolean> => {
        try {
            const response = await fetch("/api/webhooks/document", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "deleted",
                    document: { _id: documentId },
                }),
            });

            return response.ok;
        } catch (error) {
            console.error("Delete indexing error:", error);
            return false;
        }
    };

    return {
        indexDocument,
        deleteDocumentIndex,
    };
}
