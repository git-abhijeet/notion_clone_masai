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
    const [cursorPosition, setCursorPosition] = useState(0);    const overlayRef = useRef<HTMLDivElement>(null);
    const isAcceptingRef = useRef(false);
    
    // Extract text from current block
    const extractCurrentBlockText = useCallback(() => {
        try {
            const selection = editor.getTextCursorPosition();
            if (!selection?.block) return { text: "", position: 0 };

            const block = selection.block as any; // Cast to any to avoid TypeScript errors
            let text = "";

            // Extract text from block content based on BlockNote's structure
            if (block.content && Array.isArray(block.content)) {
                text = block.content
                    .map((item: any) => {
                        if (typeof item === "string") return item;
                        if (item && typeof item === "object" && item.text)
                            return item.text;
                        return "";
                    })
                    .join("");
            } else if (block.content && typeof block.content === "string") {
                text = block.content;
            } else if (block.content && typeof block.content === "object") {
                // Handle object content
                const content = block.content as any;
                if (content.text) text = content.text;
            }

            // Get cursor position (fallback to end of text)
            const position = text.length;
            return { text, position };
        } catch (error) {
            console.error("Error extracting text:", error);
            return { text: "", position: 0 };
        }
    }, [editor]);

    // Handle text changes
    const handleEditorChange = useCallback(() => {
        if (!enabled || isAcceptingRef.current) return;

        const { text, position } = extractCurrentBlockText();
        setCurrentText(text);
        setCursorPosition(position);

        // Request completion
        requestCompletion(text, position);
    }, [enabled, extractCurrentBlockText, requestCompletion]);

    // Handle key events
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
                        // Insert the completion text at cursor position
                        const selection = editor.getTextCursorPosition();
                        if (selection?.block) {
                            editor.insertInlineContent([
                                {
                                    type: "text",
                                    text: acceptedCompletion,
                                    styles: {},
                                },
                            ]);
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
        if (!enabled) return;

        document.addEventListener("keydown", handleKeyDown, true);
        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [enabled, handleKeyDown]);

    // Position completion overlay
    const positionOverlay = useCallback(() => {
        if (!completion || !enabled || !overlayRef.current) return;

        try {
            // Find the active text editor element in BlockNote
            const editorContainer = document.querySelector(
                '[data-node-type="blockContainer"][data-node-focused="true"]'
            );
            if (!editorContainer) return;

            const textElement =
                editorContainer.querySelector(".bn-inline-content");
            if (!textElement) return;

            const rect = textElement.getBoundingClientRect();
            const overlay = overlayRef.current;

            // Position the overlay at the end of the text
            overlay.style.position = "fixed";
            overlay.style.left = `${rect.right + 2}px`;
            overlay.style.top = `${rect.top}px`;
            overlay.style.zIndex = "1000";
            overlay.style.pointerEvents = "none";
            overlay.style.userSelect = "none";
        } catch (error) {
            console.error("Error positioning overlay:", error);
        }
    }, [completion, enabled]);

    // Update overlay position
    useEffect(() => {
        if (!completion || !enabled) return;

        positionOverlay();

        // Update position on scroll/resize
        const handleUpdate = () => requestAnimationFrame(positionOverlay);
        window.addEventListener("scroll", handleUpdate, true);
        window.addEventListener("resize", handleUpdate);

        // Also update on any DOM changes (for when text changes)
        const observer = new MutationObserver(handleUpdate);
        const editorElement = document.querySelector(
            '[data-node-type="blockContainer"]'
        );
        if (editorElement) {
            observer.observe(editorElement, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }

        return () => {
            window.removeEventListener("scroll", handleUpdate, true);
            window.removeEventListener("resize", handleUpdate);
            observer.disconnect();
        };
    }, [completion, enabled, positionOverlay]);

    if (!enabled || !completion || isLoading) {
        return null;
    }

    return (
        <div
            ref={overlayRef}
            className="text-gray-400 dark:text-gray-500 pointer-events-none select-none"
            style={{
                position: "fixed",
                opacity: 0.6,
                fontStyle: "italic",
                whiteSpace: "nowrap",
                fontSize: "inherit",
                fontFamily: "inherit",
                lineHeight: "inherit",
                zIndex: 1000,
            }}
        >
            {completion}
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-600">
                (Tab to accept)
            </span>
        </div>
    );
}

export default BlockNoteTextCompletion;
