import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Function to validate the user's identity
const validateUser = async (ctx: any): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return identity.subject; // Return the user's unique ID
};

// Function to fetch a document and ensure the user has access to it
const fetchDocument = async (ctx: any, id: Id<"documents">, userId: string) => {
    const document = await ctx.db.get(id);
    if (!document || document.userId !== userId)
        throw new Error("Unauthorized");
    return document; // Return the document if it exists and the user is authorized
};

// Function to recursively archive or restore child documents
const recursiveOperation = async (
    ctx: any,
    documentId: Id<"documents">,
    userId: string,
    isArchived: boolean
) => {
    const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (q: any) =>
            q.eq("userId", userId).eq("parentDocument", documentId)
        )
        .collect();

    // Iterate over each child document
    for (const child of children) {
        await ctx.db.patch(child._id, { isArchived }); // Update the archive status
        await recursiveOperation(ctx, child._id, userId, isArchived); // Recursively update children
    }
};

// Mutation to create a new document
export const createDocument = mutation({
    args: {
        title: v.string(), // Title of the document
        parentDocument: v.optional(v.id("documents")), // Optional parent document ID
    },
    handler: async (ctx, args) => {
        const userId = await validateUser(ctx); // Validate the user
        return await ctx.db.insert("documents", {
            title: args.title,
            parentDocument: args.parentDocument,
            userId, // Associate the document with the current user
            isArchived: false,
            isPublished: false,
        });
    },
});

// Query to retrieve documents for the sidebar
export const getSideBar = query({
    args: {
        parentDocument: v.optional(v.id("documents")), // Optional parent document ID
    },
    handler: async (ctx, args) => {
        const userId = await validateUser(ctx); // Validate the user
        return await ctx.db
            .query("documents")
            .withIndex("by_user_parent", (q: any) =>
                q.eq("userId", userId).eq("parentDocument", args.parentDocument)
            )
            .filter((q: any) => q.eq(q.field("isArchived"), false)) // Exclude archived documents
            .order("desc") // Order by most recent
            .collect(); // Collect and return results
    },
});

// Mutation to archive a document and its children
export const archiveDocument = mutation({
    args: { id: v.id("documents") }, // Document ID to archive
    handler: async (ctx, args) => {
        const userId = await validateUser(ctx); // Validate the user
        const document = await fetchDocument(ctx, args.id, userId); // Fetch and validate the document

        console.log("📁 [ARCHIVE] Starting document archival process:", {
            documentId: args.id,
            title: document.title,
            timestamp: new Date().toISOString(),
        });

        await ctx.db.patch(args.id, { isArchived: true }); // Archive the document
        await recursiveOperation(ctx, args.id, userId, true); // Recursively archive children

        // Remove archived document from Pinecone index (archived docs shouldn't appear in search)
        console.log(
            "📁 [ARCHIVE] Scheduling Pinecone cleanup for archived document:",
            args.id
        );
        await ctx.scheduler.runAfter(0, api.documents.cleanupPineconeIndex, {
            documentId: args.id,
            title: document.title,
            content: document.content,
            userId: document.userId,
        });

        console.log("✅ [ARCHIVE] Document archival completed:", args.id);
    },
});

// Query to get all archived documents (the trash)
export const getTrash = query({
    handler: async (ctx) => {
        const userId = await validateUser(ctx); // Validate the user
        return await ctx.db
            .query("documents")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .filter((q: any) => q.eq(q.field("isArchived"), true)) // Only include archived documents
            .order("desc")
            .collect(); // Collect and return results
    },
});

// Mutation to restore a document from the archive
export const restoreDocument = mutation({
    args: { id: v.id("documents") }, // Document ID to restore
    handler: async (ctx, args) => {
        const userId = await validateUser(ctx); // Validate the user
        const document = await fetchDocument(ctx, args.id, userId); // Fetch and validate the document

        const options: Partial<Doc<"documents">> = { isArchived: false }; // Set the archive status to false
        if (document.parentDocument) {
            const parentDocument = await ctx.db.get(document.parentDocument);
            if (parentDocument?.isArchived) options.parentDocument = undefined; // Unlink if the parent is archived
        }

        await ctx.db.patch(args.id, options); // Restore the document
        await recursiveOperation(ctx, args.id, userId, false); // Recursively restore children

        // Re-index restored document if it has content
        if (document.content) {
            await ctx.scheduler.runAfter(0, api.documents.reindexDocument, {
                documentId: args.id,
                title: document.title,
                content: document.content,
                userId: document.userId,
            });
        }
    },
});

// Action to re-index document in Pinecone after restoration
export const reindexDocument = action({
    args: {
        documentId: v.string(),
        title: v.string(),
        content: v.string(),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            // Get the base URL for the webhook
            const baseUrl =
                process.env.WEBHOOK_BASE_URL || "http://localhost:3001";

            const response = await fetch(`${baseUrl}/api/webhooks/document`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "updated",
                    document: {
                        _id: args.documentId,
                        title: args.title,
                        content: args.content,
                        userId: args.userId,
                    },
                }),
            });

            if (!response.ok) {
                console.error(
                    "Failed to re-index document in Pinecone:",
                    await response.text()
                );
                return {
                    success: false,
                    error: "Failed to re-index in Pinecone",
                };
            }

            return { success: true };
        } catch (error) {
            console.error("Error re-indexing document in Pinecone:", error);
            return {
                success: false,
                error: "Network error during Pinecone re-indexing",
            };
        }
    },
});

// Action to remove document from Pinecone after database deletion
export const cleanupPineconeIndex = action({
    args: {
        documentId: v.string(),
        title: v.string(),
        content: v.optional(v.string()),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        console.log(
            "🧹 [CONVEX CLEANUP] Starting Pinecone cleanup for document:",
            {
                documentId: args.documentId,
                title: args.title,
                timestamp: new Date().toISOString(),
            }
        );

        try {
            // Get the base URL for the webhook
            const baseUrl =
                process.env.WEBHOOK_BASE_URL || "http://localhost:3001";

            console.log(
                "🧹 [CONVEX CLEANUP] Sending deletion request to webhook:",
                {
                    baseUrl,
                    webhookUrl: `${baseUrl}/api/webhooks/document`,
                    documentId: args.documentId,
                }
            );

            const response = await fetch(`${baseUrl}/api/webhooks/document`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "deleted",
                    document: {
                        _id: args.documentId,
                        title: args.title,
                        content: args.content || "",
                        userId: args.userId,
                    },
                }),
            });

            console.log("🧹 [CONVEX CLEANUP] Webhook response received:", {
                status: response.status,
                statusText: response.statusText,
                documentId: args.documentId,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(
                    "❌ [CONVEX CLEANUP] Failed to remove document from Pinecone:",
                    {
                        status: response.status,
                        statusText: response.statusText,
                        error: errorText,
                        documentId: args.documentId,
                    }
                );
                return {
                    success: false,
                    error: "Failed to cleanup Pinecone index",
                };
            }

            const responseData = await response.json();
            console.log(
                "✅ [CONVEX CLEANUP] Pinecone cleanup completed successfully:",
                {
                    documentId: args.documentId,
                    responseData,
                }
            );

            return { success: true };
        } catch (error) {
            console.error(
                "❌ [CONVEX CLEANUP] Error removing document from Pinecone:",
                {
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                    documentId: args.documentId,
                    stack: error instanceof Error ? error.stack : undefined,
                }
            );
            return {
                success: false,
                error: "Network error during Pinecone cleanup",
            };
        }
    },
});

// Mutation to permanently remove a document
export const removeDocument = mutation({
    args: { id: v.id("documents") }, // Document ID to remove
    handler: async (ctx, args) => {
        const userId = await validateUser(ctx); // Validate the user
        const document = await fetchDocument(ctx, args.id, userId); // Fetch and validate the document

        console.log("🗑️ [REMOVE] Starting permanent document removal:", {
            documentId: args.id,
            title: document.title,
            timestamp: new Date().toISOString(),
        });

        // Delete from database first
        await ctx.db.delete(args.id);
        console.log("🗑️ [REMOVE] Document deleted from database:", args.id);

        // Schedule Pinecone cleanup to run after database deletion
        console.log(
            "🗑️ [REMOVE] Scheduling Pinecone cleanup for removed document:",
            args.id
        );
        await ctx.scheduler.runAfter(0, api.documents.cleanupPineconeIndex, {
            documentId: args.id,
            title: document.title,
            content: document.content,
            userId: document.userId,
        });

        console.log("✅ [REMOVE] Document removal completed:", args.id);
        return { success: true, documentId: args.id };
    },
});

// Query to search for documents
export const getSearch = query({
    handler: async (ctx) => {
        const userId = await validateUser(ctx); // Validate the user
        return await ctx.db
            .query("documents")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .filter((q: any) => q.eq(q.field("isArchived"), false)) // Exclude archived documents
            .order("desc")
            .collect(); // Collect and return results
    },
});

// Query to search for documents by title (partial match or return all if no title is provided or empty)
export const searchByTitle = query({
    handler: async (ctx, { title }: { title?: string }) => {
        const userId = await validateUser(ctx); // Validate the user

        // جلب المستندات المرتبطة بالمستخدم
        const documents = await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("isArchived"), false)) // Exclude archived documents
            .collect(); // Collect the results

        // إذا لم يتم إرسال عنوان أو كان العنوان نص فارغ
        if (!title || title.trim() === "") {
            return documents; // إرجاع كل المستندات غير المؤرشفة
        }

        // تصفية المستندات بناءً على تطابق العنوان
        const filteredDocuments = documents.filter(
            (doc) => doc.title.toLowerCase().includes(title.toLowerCase()) // البحث مع تجاهل حالة الأحرف
        );

        return filteredDocuments;
    },
});

// Query to retrieve a document by its ID
export const getById = query({
    args: { documentId: v.id("documents") }, // معرف المستند المطلوب
    handler: async (ctx, args) => {
        const document = await ctx.db.get(args.documentId); // جلب المستند من قاعدة البيانات
        if (!document) throw new Error("Document not found"); // إرجاع خطأ إذا لم يتم العثور على المستند
        return document; // إعادة المستند إذا كان موجودًا
    },
});

export const getPublishedDocumentById = query({
    args: { documentId: v.id("documents") }, // معرف المستند المطلوب
    handler: async (ctx, args) => {
        const document = await ctx.db.get(args.documentId); // جلب المستند من قاعدة البيانات
        if (!document) throw new Error("Document not found"); // إرجاع خطأ إذا لم يتم العثور على المستند
        if (!document.isPublished) throw new Error("Document is not published"); // إرجاع خطأ إذا لم يكن المستند منشورًا
        return document; // إعادة المستند إذا كان منشورًا
    },
});

// Mutation to update a document's details
export const updateDocument = mutation({
    args: {
        id: v.id("documents"), // معرف المستند للتحديث
        title: v.optional(v.string()), // تحديث العنوان إذا كان موجودًا
        content: v.optional(v.string()), // تحديث المحتوى إذا كان موجودًا
        coverImage: v.optional(v.string()), // تحديث صورة الغلاف إذا كانت موجودة
        icon: v.optional(v.string()), // تحديث الأيقونة إذا كانت موجودة
        isPublished: v.optional(v.boolean()), // تحديث حالة النشر إذا كانت موجودة
        tags: v.optional(v.array(v.string())), // تحديث العلامات اليدوية
        aiGeneratedTags: v.optional(v.array(v.string())), // تحديث العلامات المولدة بالذكاء الاصطناعي
    },
    handler: async (ctx, args) => {
        const { id, ...updateFields } = args; // استخراج المعرف والحقول المطلوب تحديثها
        const document = await ctx.db.get(id); // جلب المستند من قاعدة البيانات
        if (!document) throw new Error("Document not found"); // إرجاع خطأ إذا لم يتم العثور على المستند
        return await ctx.db.patch(id, updateFields); // تحديث المستند بالحقول المطلوبة
    },
});

// Mutation to remove a document's icon
export const removeIcon = mutation({
    args: { id: v.id("documents") }, // Document ID to update
    handler: async (ctx, args) => {
        const userId = await validateUser(ctx); // Validate the user
        await fetchDocument(ctx, args.id, userId); // Fetch and validate the document
        return await ctx.db.patch(args.id, { icon: undefined }); // Remove the icon
    },
});

// Mutation to remove a document's cover image
export const removeCoverImage = mutation({
    args: { id: v.id("documents") }, // Document ID to update
    handler: async (ctx, args) => {
        const userId = await validateUser(ctx); // Validate the user
        await fetchDocument(ctx, args.id, userId); // Fetch and validate the document
        return await ctx.db.patch(args.id, { coverImage: undefined }); // Remove the cover image
    },
});

// Query to get all documents with content for AI features
export const getAllWithContent = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }
        const userId = identity.subject;

        return await ctx.db
            .query("documents")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("isArchived"), false))
            .collect();
    },
});
