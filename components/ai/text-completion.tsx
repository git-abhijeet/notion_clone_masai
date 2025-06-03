"use client";

import React, { useEffect, useRef } from "react";
import { useTextCompletion } from "@/hooks/use-text-completion";

interface TextCompletionProps {
    currentText: string;
    cursorPosition: number;
    onAccept: (completion: string) => void;
    className?: string;
}

export function TextCompletion({
    currentText,
    cursorPosition,
    onAccept,
    className = "",
}: TextCompletionProps) {
    const {
        completion,
        isLoading,
        requestCompletion,
        clearCompletion,
        acceptCompletion,
    } = useTextCompletion();
    const lastTextRef = useRef(currentText);
    const lastCursorRef = useRef(cursorPosition);

    useEffect(() => {
        // Only request completion if text or cursor position changed
        if (
            currentText !== lastTextRef.current ||
            cursorPosition !== lastCursorRef.current
        ) {
            lastTextRef.current = currentText;
            lastCursorRef.current = cursorPosition;

            requestCompletion(currentText, cursorPosition);
        }
    }, [currentText, cursorPosition, requestCompletion]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Tab" && completion) {
                event.preventDefault();
                event.stopPropagation();

                const acceptedCompletion = acceptCompletion();
                if (acceptedCompletion) {
                    onAccept(acceptedCompletion);
                }
            } else if (event.key === "Escape" && completion) {
                event.preventDefault();
                clearCompletion();
            }
        };

        document.addEventListener("keydown", handleKeyDown, true);
        return () => {
            document.removeEventListener("keydown", handleKeyDown, true);
        };
    }, [completion, acceptCompletion, clearCompletion, onAccept]);

    if (!completion || isLoading) {
        return null;
    }

    return (
        <span
            className={`text-gray-400 dark:text-gray-500 pointer-events-none select-none ${className}`}
            style={{
                position: "relative",
                zIndex: 10,
                opacity: 0.6,
            }}
        >
            {completion}
        </span>
    );
}

export default TextCompletion;
