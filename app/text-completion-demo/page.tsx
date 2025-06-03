"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import TextCompletionDebugger from "@/components/ai/text-completion-debugger";

// Dynamically import Editor to avoid SSR issues
const Editor = dynamic(() => import("@/components/editor"), {
    ssr: false,
    loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg"></div>
});

export default function TextCompletionDemo() {
    const [content, setContent] = useState("");
    const [showDebugger, setShowDebugger] = useState(false);

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-4">
                    AI Text Completion Demo
                    <button
                        onClick={() => setShowDebugger(!showDebugger)}
                        className="ml-4 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-2 py-1 rounded"
                    >
                        {showDebugger ? "Hide Debugger" : "Show Debugger"}
                    </button>
                </h1>
                {showDebugger && <TextCompletionDebugger />}{" "}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <h2 className="text-lg font-semibold mb-2">How to use:</h2>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                            <span className="text-blue-500 mr-2">1.</span>
                            Start typing any text (need at least 5 characters)
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-500 mr-2">2.</span>
                            AI will suggest completions in a blue popup
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-500 mr-2">3.</span>
                            Press{" "}
                            <kbd className="mx-1 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                Tab
                            </kbd>{" "}
                            to accept suggestions
                        </li>
                        <li className="flex items-start">
                            <span className="text-blue-500 mr-2">4.</span>
                            Press{" "}
                            <kbd className="mx-1 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                Escape
                            </kbd>{" "}
                            to dismiss suggestions
                        </li>
                    </ul>
                    <div className="mt-3 text-xs text-blue-600 dark:text-blue-400">
                        For full documentation, see{" "}
                        <a
                            href="/docs/text-completion-guide.md"
                            className="underline"
                        >
                            Text Completion Guide
                        </a>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <h3 className="font-semibold mb-2">
                            Geography examples:
                        </h3>                        <ul className="space-y-1 text-sm">
                            <li>• &quot;The capital of France is&quot;</li>
                            <li>• &quot;The capital of India is&quot;</li>
                            <li>• &quot;The capital of Japan is&quot;</li>
                            <li>• &quot;The capital of Brazil is&quot;</li>
                        </ul>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Tech examples:</h3>                        <ul className="space-y-1 text-sm">
                            <li>• &quot;JavaScript is a programming&quot;</li>
                            <li>• &quot;Python is a&quot;</li>
                            <li>• &quot;React is a&quot;</li>
                            <li>• &quot;Next.js is a&quot;</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">
                    Editor with AI Text Completion
                </h3>
                <Editor
                    onChange={setContent}
                    editable={true}
                    aiTextCompletion={true}
                />
            </div>

            {content && (
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-2">
                        Content Preview:
                    </h3>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-auto">
                        {content}
                    </pre>
                </div>
            )}
        </div>
    );
}
