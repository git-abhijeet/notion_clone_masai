import { Pinecone } from "@pinecone-database/pinecone";
import { Id } from "@/convex/_generated/dataModel";

let pinecone: Pinecone | null = null;

export const getPineconeClient = async (): Promise<Pinecone> => {
    if (!pinecone) {
        pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });
    }
    return pinecone;
};

export const PINECONE_INDEX_NAME =
    process.env.PINECONE_INDEX_NAME || "notion-clone";

export interface DocumentMetadata {
    documentId: string;
    title: string;
    content: string;
    userId?: string;
    createdAt: string;
    updatedAt: string;
    isConvexId?: boolean; // Flag to indicate if this is a valid Convex ID
    [key: string]: any; // Index signature to match Pinecone's RecordMetadata
}

// Helper function to safely format document IDs for vector storage
// This ensures IDs are safe to use in both Pinecone and when retrieved back
export const formatDocumentId = (id: string | Id<"documents">): string => {
    // If it's already a string (not a Convex ID), return it
    if (typeof id === "string" && !id.includes("/")) {
        return id;
    }

    // For Convex IDs, convert to a safe string format
    const idString = String(id);
    // Store the original format to help identify it later
    return idString;
};

// Helper function to check if an ID is likely a valid Convex ID
export const isValidConvexId = (id: string): boolean => {
    // Convex IDs typically match this pattern
    return /^[a-zA-Z0-9_-]{20,}$/.test(id);
};

export interface EmbeddingVector {
    id: string;
    values: number[];
    metadata: DocumentMetadata;
}
