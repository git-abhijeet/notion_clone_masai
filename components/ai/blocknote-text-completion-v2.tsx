"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { BlockNoteEditor } from "@blocknote/core";
import { useTextCompletion } from "@/hooks/use-text-completion";

interface BlockNoteTextCompletionProps {
    editor: BlockNoteEditor;
    enabled: boolean;
}

export function BlockNoteTextCompletion({
    editor,
    enabled,
}: BlockNoteTextCompletionProps) {
    const {
        completion,
        isLoading,
        requestCompletion,
        clearCompletion,
        acceptCompletion,
    } = useTextCompletion();
    const [currentText, setCurrentText] = useState("");
    const overlayRef = useRef<HTMLDivElement>(null);
    const isAcceptingRef = useRef(false); // Extract text from current block (improved approach)
    const extractEditorText = useCallback(() => {
        try {
            // Get the current selection
            const selection = editor.getSelection();
            if (!selection) return { text: "", position: 0 };
            // Find the block where the cursor is
            const blockId =
                selection?.blocks?.[0]?.id || (selection as any)?.blockId;
            const block = editor.getBlock(blockId);
            if (!block) return { text: "", position: 0 };
            // Get text from the block
            let blockText = "";
            if (block.content && Array.isArray(block.content)) {
                blockText = block.content
                    .map((item: any) => {
                        if (typeof item === "string") return item;
                        if (item && typeof item === "object" && "text" in item)
                            return item.text;
                        return "";
                    })
                    .join("");
            }
            // Try to get the cursor position within the block
            let cursorPosition = blockText.length;
            if (
                selection &&
                (selection as any).from &&
                typeof (selection as any).from.offset === "number"
            ) {
                cursorPosition = (selection as any).from.offset;
            }
            return { text: blockText, position: cursorPosition };
        } catch (error) {
            console.error("Error extracting editor text:", error);
            return { text: "", position: 0 };
        }
    }, [editor]);

    // Handle text changes
    const handleEditorChange = useCallback(() => {
        if (!enabled || isAcceptingRef.current) return;

        const { text, position } = extractEditorText();
        setCurrentText(text);

        // Request completion
        requestCompletion(text, position);
    }, [enabled, extractEditorText, requestCompletion]); // Handle key events
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            if (event.key === "Tab" && completion && !isLoading) {
                event.preventDefault();
                event.stopPropagation();

                isAcceptingRef.current = true;

                try {
                    const acceptedCompletion = acceptCompletion();
                    if (acceptedCompletion) {
                        // Focus editor and insert text at current position
                        editor.focus();

                        // Insert content safely
                        try {
                            // BlockNote's insertInlineContent will insert at current cursor position
                            editor.insertInlineContent([
                                {
                                    type: "text",
                                    text: acceptedCompletion,
                                    styles: {},
                                },
                            ]);
                        } catch (insertError) {
                            console.error("Insert error:", insertError);

                            // Try an alternative approach if the first method fails
                            const currentBlocks = editor.topLevelBlocks;
                            if (currentBlocks.length > 0) {
                                const lastBlock =
                                    currentBlocks[currentBlocks.length - 1];
                                editor.updateBlock(lastBlock, {
                                    // Append text to the last block
                                    content: [
                                        ...(Array.isArray(lastBlock.content)
                                            ? lastBlock.content
                                            : []),
                                        {
                                            type: "text",
                                            text: acceptedCompletion,
                                            styles: {},
                                        },
                                    ],
                                });
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error accepting completion:", error);
                } finally {
                    setTimeout(() => {
                        isAcceptingRef.current = false;
                    }, 100);
                }
            } else if (event.key === "Escape" && completion) {
                event.preventDefault();
                clearCompletion();
            }
        },
        [
            enabled,
            completion,
            isLoading,
            acceptCompletion,
            clearCompletion,
            editor,
        ]
    );

    // Set up editor listeners
    useEffect(() => {
        if (!enabled) return;

        const unsubscribe = editor.onChange(handleEditorChange);
        return unsubscribe;
    }, [enabled, editor, handleEditorChange]);
    // Set up keyboard listeners
    useEffect(() => {
        if (!enabled || typeof window === "undefined") return;

        document.addEventListener("keydown", handleKeyDown, true);
        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [enabled, handleKeyDown]);
    // Listen for every keystroke to trigger completion
    useEffect(() => {
        if (!enabled || typeof window === "undefined") return;
        const onKeyUp = () => {
            if (!isAcceptingRef.current) {
                handleEditorChange();
            }
        };
        document.addEventListener("keyup", onKeyUp, true);
        return () => {
            document.removeEventListener("keyup", onKeyUp, true);
        };
    }, [enabled, handleEditorChange]);
    // Position completion overlay
    const positionOverlay = useCallback(() => {
        if (
            !completion ||
            !enabled ||
            !overlayRef.current ||
            typeof window === "undefined"
        )
            return;

        try {
            // Find the focused editor element
            const focusedElement = document.activeElement;
            if (!focusedElement) return;

            // Look for BlockNote editor container
            const editorContainer =
                focusedElement.closest("[data-node-type]") ||
                document.querySelector(".bn-editor") ||
                document.querySelector('[contenteditable="true"]');

            if (!editorContainer) return;

            const rect = editorContainer.getBoundingClientRect();
            const overlay = overlayRef.current; // Calculate the best position for the overlay
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const preferredRight = rect.right + 10;
            const preferredLeft = rect.left;

            // Position the overlay in a more visible area
            overlay.style.position = "fixed";

            // First try to position to the right of the text
            if (preferredRight + 200 < viewportWidth) {
                overlay.style.left = `${preferredRight}px`;
            }
            // If that doesn't fit, try to position to the left
            else if (preferredLeft > 220) {
                overlay.style.left = `${preferredLeft - 220}px`;
            }
            // Last resort: position at the right edge of screen with some margin
            else {
                overlay.style.left = `${viewportWidth - 320}px`;
            }

            // Position vertically - try to show near the current line
            overlay.style.top = `${Math.max(Math.min(rect.top, viewportHeight - 100), 10)}px`;
            overlay.style.zIndex = "1000";
            overlay.style.pointerEvents = "none";
            overlay.style.userSelect = "none";
        } catch (error) {
            console.error("Error positioning overlay:", error);
        }
    }, [completion, enabled]);
    // Update overlay position
    useEffect(() => {
        if (!completion || !enabled || typeof window === "undefined") return;

        positionOverlay();

        // Update position on scroll/resize
        const handleUpdate = () => requestAnimationFrame(positionOverlay);
        window.addEventListener("scroll", handleUpdate, true);
        window.addEventListener("resize", handleUpdate);

        return () => {
            window.removeEventListener("scroll", handleUpdate, true);
            window.removeEventListener("resize", handleUpdate);
        };
    }, [completion, enabled, positionOverlay]);

    // --- DEBUG OVERLAY ---
    const [debugInfo, setDebugInfo] = useState<{
        text: string;
        position: number;
        completion: string;
    }>({ text: "", position: 0, completion: "" });
    useEffect(() => {
        const { text, position } = extractEditorText();
        setDebugInfo({ text, position, completion });
    }, [currentText, completion, extractEditorText]);

    if (!enabled || (!completion && !debugInfo.text) || isLoading) {
        return null;
    }
    return (
        <>
            <div
                ref={overlayRef}
                className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-700 pointer-events-none select-none shadow-lg transition-opacity duration-200"
                style={{
                    position: "fixed",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    zIndex: 9999,
                    maxWidth: "300px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    animation: "fadeIn 0.2s ease-in-out",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
            >
                <div className="flex items-center space-x-2">
                    <span className="font-medium flex items-center">
                        <span className="text-blue-500 mr-1.5 text-lg">💡</span>
                        <span className="completion-text">{completion}</span>
                    </span>
                    <div className="flex items-center bg-blue-100/50 dark:bg-blue-800/50 rounded px-2 py-0.5">
                        <kbd className="bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded text-xs font-mono mr-1">
                            Tab
                        </kbd>
                        <span className="text-xs text-blue-600 dark:text-blue-300">
                            to accept
                        </span>
                    </div>
                </div>
                <style jsx>{`
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(-5px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .completion-text {
                        position: relative;
                        display: inline-block;
                    }
                    .completion-text::after {
                        content: "";
                        position: absolute;
                        bottom: -2px;
                        left: 0;
                        width: 100%;
                        height: 2px;
                        background: currentColor;
                        opacity: 0.3;
                    }
                `}</style>
            </div>
            {/* DEBUG OVERLAY */}
            <div
                style={{
                    position: "fixed",
                    bottom: 10,
                    right: 10,
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    zIndex: 99999,
                    pointerEvents: "auto",
                    maxWidth: 400,
                    wordBreak: "break-all",
                }}
            >
                <div>
                    <b>DEBUG</b>
                </div>
                <div>
                    <b>Text:</b> {JSON.stringify(debugInfo.text)}
                </div>
                <div>
                    <b>Cursor:</b> {debugInfo.position}
                </div>
                <div>
                    <b>Completion:</b> {JSON.stringify(debugInfo.completion)}
                </div>
            </div>
        </>
    );
}

export default BlockNoteTextCompletion;
