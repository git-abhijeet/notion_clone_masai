import { useState } from "react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export const usePineconeCleanup = () => {
    const [isCleaningUp, setIsCleaningUp] = useState(false);

    const cleanupDocument = async (documentId: string | Id<"documents">) => {
        setIsCleaningUp(true);
        try {
            console.log(
                "🧹 [PINECONE CLEANUP] Starting manual cleanup for:",
                documentId
            );

            // First try the webhook approach (standard cleanup)
            const webhookResponse = await fetch("/api/webhooks/document", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "deleted",
                    document: {
                        _id: documentId,
                        title: "Manual Cleanup",
                        content: "",
                    },
                }),
            });

            if (webhookResponse.ok) {
                console.log("✅ [PINECONE CLEANUP] Webhook cleanup successful");
                return { success: true, method: "webhook" };
            }

            console.warn(
                "⚠️ [PINECONE CLEANUP] Webhook failed, trying direct deletion"
            );

            // Fallback: Direct deletion via embeddings API
            const directResponse = await fetch(
                `/api/embeddings?documentId=${documentId}`,
                {
                    method: "DELETE",
                }
            );

            if (directResponse.ok) {
                console.log("✅ [PINECONE CLEANUP] Direct deletion successful");
                return { success: true, method: "direct" };
            }

            throw new Error("Both webhook and direct deletion failed");
        } catch (error) {
            console.error("❌ [PINECONE CLEANUP] Cleanup failed:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        } finally {
            setIsCleaningUp(false);
        }
    };

    const verifyDocumentDeleted = async (
        documentId: string | Id<"documents">
    ) => {
        try {
            const response = await fetch(
                `/api/debug-pinecone?action=fetch&documentId=${documentId}`
            );
            const result = await response.json();
            return !result.data?.exists;
        } catch (error) {
            console.error("Error verifying document deletion:", error);
            return false;
        }
    };

    const bulkCleanupOrphanedDocuments = async (validDocumentIds: string[]) => {
        setIsCleaningUp(true);
        try {
            // Get all vectors in Pinecone
            const listResponse = await fetch("/api/debug-pinecone?action=list");
            const listResult = await listResponse.json();

            if (!listResult.success) {
                throw new Error("Failed to list Pinecone documents");
            }

            const pineconeDocIds = listResult.data.matches.map(
                (match: any) => match.id
            );
            const orphanedIds = pineconeDocIds.filter(
                (id: string) => !validDocumentIds.includes(id)
            );

            if (orphanedIds.length === 0) {
                toast.success("No orphaned documents found in Pinecone");
                return { success: true, cleaned: 0 };
            }

            let cleanedCount = 0;
            for (const orphanedId of orphanedIds) {
                const result = await cleanupDocument(orphanedId);
                if (result.success) {
                    cleanedCount++;
                }
            }

            toast.success(
                `Cleaned up ${cleanedCount} orphaned documents from Pinecone`
            );
            return { success: true, cleaned: cleanedCount };
        } catch (error) {
            console.error("Bulk cleanup failed:", error);
            toast.error("Failed to clean up orphaned documents");
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        } finally {
            setIsCleaningUp(false);
        }
    };

    return {
        cleanupDocument,
        verifyDocumentDeleted,
        bulkCleanupOrphanedDocuments,
        isCleaningUp,
    };
};
