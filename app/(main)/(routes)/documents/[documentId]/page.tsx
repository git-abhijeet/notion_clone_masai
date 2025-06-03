"use client";
import Cover from "@/app/(main)/_components/cover";
import Toolbar from "@/components/toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useCallback, useRef } from "react";
import { useAutoTagger } from "@/hooks/use-auto-tagger";
// import { useDocumentIndexing } from "@/hooks/use-document-indexing";
import { Badge } from "@/components/ui/badge";
import { debounce } from "lodash";

interface DocumentsIdPageProps {
    params: {
        documentId: Id<"documents">;
    };
}
function DocumentsIdPage({ params }: DocumentsIdPageProps) {
    const Editor = useMemo(() => {
        return dynamic(() => import("@/components/editor"), {
            ssr: false,
        });
    }, []);
    const router = useRouter();
    const document = useQuery(api.documents.getById, {
        documentId: params.documentId,
    });

    const update = useMutation(api.documents.updateDocument);
    const { generateTags, isLoading: isGeneratingTags } = useAutoTagger();
    // const { indexDocument } = useDocumentIndexing();

    // Debounced indexing function to avoid too many API calls
    // const debouncedIndexDocument = useMemo(
    //   () => debounce(async (docId: string, title: string, content: string) => {
    //     try {
    //       await indexDocument({
    //         documentId: docId,
    //         title,
    //         content,
    //       });
    //       console.log('Document indexed successfully');
    //     } catch (error) {
    //       console.error('Failed to index document:', error);
    //     }
    //   }, 2000), // 2 second delay
    //   [indexDocument]
    // );

    const onChange = (content: string) => {
        update({ id: params.documentId, content });

        // Automatically index the document with the updated content
        // if (document?.title && content) {
        //   debouncedIndexDocument(params.documentId, document.title, content);
        // }
    };

    const handleGenerateTags = async () => {
        if (document?.content) {
            const tags = await generateTags(
                document.content,
                document.title || "Untitled"
            );
            if (tags?.length > 0) {
                await update({
                    id: params.documentId,
                    aiGeneratedTags: tags,
                });
            }
        }
    };

    useEffect(() => {
        if (!params.documentId) {
            router.push("/documents");
        }
    }, [params.documentId, router]);

    if (document === undefined)
        return (
            <div>
                <Cover.Skeleton />
                <div className="md:max-w-3xl lg:max-w-4xl mx-auto mt-10">
                    <div className="space-y-4 pl-8 pt-4">
                        <Skeleton className="h-14 w-[50%]" />
                        <Skeleton className="h-4 w-[80%]" />
                        <Skeleton className="h-4 w-[40%]" />
                        <Skeleton className="h-4 w-[60%]" />
                    </div>
                </div>
            </div>
        );

    if (document === null) return <div>Document not found</div>;

    return (
        <div className="pb-40">
            <Cover url={document.coverImage} />
            <div className="md:max-w-3xl lg:max-w-4xl mx-auto">
                <Toolbar initialData={document} />

                {/* AI-Generated Tags Section */}
                {((document.aiGeneratedTags &&
                    document.aiGeneratedTags.length > 0) ||
                    isGeneratingTags) && (
                    <div className="px-[54px] py-4">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-sm font-medium text-muted-foreground">
                                AI Generated Tags:
                            </h3>
                            {isGeneratingTags && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {document.aiGeneratedTags?.map((tag, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-xs"
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {/* Auto-tag generation button */}
                {document.content && !isGeneratingTags && (
                    <div className="px-[54px] pb-4">
                        <button
                            onClick={handleGenerateTags}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            ✨ Generate AI Tags
                        </button>
                    </div>
                )}

                <Editor
                    onChange={onChange}
                    initialContent={document.content}
                    editable={true}
                    aiTextCompletion={true}
                />
            </div>
        </div>
    );
}

export default DocumentsIdPage;
