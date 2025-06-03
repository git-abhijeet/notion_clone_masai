import { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash";

export function useTextCompletion() {
    const [completion, setCompletion] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [lastRequestId, setLastRequestId] = useState(0);
    const [lastText, setLastText] = useState("");
    const [completionHistory, setCompletionHistory] = useState<
        Record<string, string>
    >({});

    const fetchCompletion = useCallback(
        debounce(
            async (text: string, cursorPosition: number, requestId: number) => {
                // Check if this is still the latest request
                if (requestId !== lastRequestId) return;

                try {
                    setIsLoading(true);

                    // Check if we already have a cached completion for this text
                    const textKey = text.trim().toLowerCase();
                    if (completionHistory[textKey]) {
                        setCompletion(completionHistory[textKey]);
                        setIsLoading(false);
                        return;
                    }

                    // Don't send requests for very similar text in a short time
                    if (
                        Math.abs(text.length - lastText.length) < 3 &&
                        text.length > 0 &&
                        lastText.length > 0
                    ) {
                        // If the text is very similar to the last request, wait longer
                        await new Promise((resolve) =>
                            setTimeout(resolve, 300)
                        );
                        // If no longer the latest request after waiting, abort
                        if (requestId !== lastRequestId) {
                            return;
                        }
                    }

                    const response = await fetch("/api/ai/text-completion", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ text, cursorPosition }),
                    });

                    if (!response.ok) {
                        throw new Error("Failed to fetch completion");
                    }

                    const data = await response.json();

                    // Only update if this is still the latest request
                    if (requestId === lastRequestId) {
                        const newCompletion = data.completion || "";
                        setCompletion(newCompletion);

                        // Cache successful completions
                        if (newCompletion) {
                            setCompletionHistory((prev) => ({
                                ...prev,
                                [textKey]: newCompletion,
                            }));
                        }

                        // Update last text
                        setLastText(text);
                    }
                } catch (error) {
                    console.error("Text completion error:", error);
                    if (requestId === lastRequestId) {
                        setCompletion("");
                    }
                } finally {
                    if (requestId === lastRequestId) {
                        setIsLoading(false);
                    }
                }
            },
            500
        ), // 500ms debounce
        [lastRequestId, lastText, completionHistory]
    );
    const requestCompletion = useCallback(
        (text: string, cursorPosition: number) => {
            const requestId = Date.now();
            setLastRequestId(requestId);
            setCompletion(""); // Clear previous completion

            // Don't request completion for very short text or if cursor is not at end
            if (text.trim().length < 5 || cursorPosition < text.length - 1) {
                setIsLoading(false);
                return;
            }

            fetchCompletion(text, cursorPosition, requestId);
        },
        [fetchCompletion]
    );

    const clearCompletion = useCallback(() => {
        setCompletion("");
        setIsLoading(false);
    }, []);

    const acceptCompletion = useCallback(() => {
        const currentCompletion = completion;
        setCompletion("");
        return currentCompletion;
    }, [completion]);

    return {
        completion,
        isLoading,
        requestCompletion,
        clearCompletion,
        acceptCompletion,
    };
}
