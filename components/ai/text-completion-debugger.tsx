"use client";

import { useState, useEffect } from "react";

interface DebuggerProps {
    onTestCompletion?: () => void;
}

export default function TextCompletionDebugger({
    onTestCompletion,
}: DebuggerProps) {
    const [inputText, setInputText] = useState("the capital of india is");
    const [cursorPosition, setCursorPosition] = useState(22);
    const [apiResponse, setApiResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const testCompletion = async () => {
        setIsLoading(true);
        setApiResponse("");

        try {
            const response = await fetch("/api/ai/text-completion", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: inputText,
                    cursorPosition: cursorPosition,
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            setApiResponse(JSON.stringify(data, null, 2));

            if (onTestCompletion) {
                onTestCompletion();
            }
        } catch (error) {
            console.error("Error testing completion:", error);
            setApiResponse(
                `Error: ${error instanceof Error ? error.message : String(error)}`
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3">Text Completion Debugger</h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Test Text:
                    </label>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => {
                            setInputText(e.target.value);
                            setCursorPosition(e.target.value.length);
                        }}
                        className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded px-3 py-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cursor Position: {cursorPosition}
                    </label>
                    <input
                        type="range"
                        min={0}
                        max={inputText.length}
                        value={cursorPosition}
                        onChange={(e) =>
                            setCursorPosition(parseInt(e.target.value))
                        }
                        className="w-full"
                    />
                    <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                        <code>
                            {inputText.substring(0, cursorPosition)}
                            <span className="bg-blue-500 text-white px-0.5">
                                |
                            </span>
                            {inputText.substring(cursorPosition)}
                        </code>
                    </div>
                </div>

                <button
                    onClick={testCompletion}
                    disabled={isLoading}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                    {isLoading ? "Testing..." : "Test Completion"}
                </button>

                {apiResponse && (
                    <div>
                        <h4 className="text-sm font-medium mb-1">
                            API Response:
                        </h4>
                        <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-32">
                            {apiResponse}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
