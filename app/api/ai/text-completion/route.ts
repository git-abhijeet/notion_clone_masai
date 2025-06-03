import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Common patterns for faster responses
const commonCompletions: Record<string, string> = {
    // Capital cities
    "the capital of india is": "New Delhi",
    "the capital of usa is": "Washington D.C.",
    "the capital of united states is": "Washington D.C.",
    "the capital of uk is": "London",
    "the capital of united kingdom is": "London",
    "the capital of japan is": "Tokyo",
    "the capital of china is": "Beijing",
    "the capital of australia is": "Canberra",
    "the capital of france is": "Paris",
    "the capital of germany is": "Berlin",
    "the capital of italy is": "Rome",
    "the capital of spain is": "Madrid",
    "the capital of brazil is": "Brasília",
    "the capital of canada is": "Ottawa",
    "the capital of russia is": "Moscow",
    "the capital of south korea is": "Seoul",

    // Programming languages
    "javascript is a programming": "language",
    "python is a": "programming language",
    "react is a": "JavaScript library",
    "next.js is a": "React framework",

    // Common phrases
    "thank you for your": "attention",
    "in conclusion": " we can say that",
    "to summarize the main": "points",
    "the most important thing to": "remember is",

    // Dates
    "today is june": "3, 2025",
};

export async function POST(req: NextRequest) {
    try {
        const { text, cursorPosition } = await req.json();

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ completion: "" });
        }

        // Get the text before cursor for context
        const contextText = text.substring(0, cursorPosition);
        const words = contextText.trim().split(/\s+/);

        // Only suggest if we have at least 2 words for context
        if (words.length < 2) {
            return NextResponse.json({ completion: "" });
        }

        // Get the last few words for better context
        const lastWords = words.slice(-10).join(" ");
        const lastWordsLower = lastWords.toLowerCase();

        // Check for common patterns first (case insensitive)
        for (const [pattern, response] of Object.entries(commonCompletions)) {
            if (lastWordsLower.includes(pattern)) {
                let hardcodedCompletion = response;

                // Make sure completion starts with a space if needed
                if (
                    hardcodedCompletion &&
                    !contextText.endsWith(" ") &&
                    !hardcodedCompletion.startsWith(" ")
                ) {
                    hardcodedCompletion = " " + hardcodedCompletion;
                }

                console.log(
                    "Found hardcoded match:",
                    pattern,
                    "→",
                    hardcodedCompletion
                );
                return NextResponse.json({ completion: hardcodedCompletion });
            }
        }

        // Build a prompt for Gemini
        const prompt = `Continue the following text as a helpful writing assistant. Only provide the next few words or phrase that would naturally follow, not a full sentence or paragraph.\n\nText so far: "${contextText}"\nCompletion:`;

        // Use the Gemini 2.0 Flash model for completions
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        console.log("[AI COMPLETION] Gemini prompt:", prompt);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("[AI COMPLETION] Gemini raw response:", response);
        let aiCompletion = response.text().trim();

        // Clean up the completion
        aiCompletion = aiCompletion.replace(/"/g, "").trim();

        // Don't suggest if completion is too long or exactly matches the original text
        if (
            aiCompletion.length > 50 ||
            aiCompletion.toLowerCase() === lastWordsLower
        ) {
            aiCompletion = "";
        }

        // Debug logging for development
        console.log("Context:", lastWords);
        console.log("Generated completion:", aiCompletion);

        // Make sure completion starts with a space if needed
        if (
            aiCompletion &&
            !contextText.endsWith(" ") &&
            !aiCompletion.startsWith(" ")
        ) {
            aiCompletion = " " + aiCompletion;
        }

        return NextResponse.json({ completion: aiCompletion });
    } catch (error) {
        console.error("Text completion error:", error);

        // Attempt to provide a fallback response
        try {
            // Recompute lastWords for fallback
            const { text, cursorPosition } = await req.json();
            const contextText = text.substring(0, cursorPosition);
            const words = contextText.trim().split(/\s+/);
            const lastWords = words.slice(-10).join(" ");
            const lastWordsLower = lastWords?.toLowerCase() || "";

            // Check if lastWords matches a partial pattern
            if (lastWordsLower.includes("capital of")) {
                for (const [key, value] of Object.entries(commonCompletions)) {
                    if (
                        key.includes("capital of") &&
                        lastWordsLower.includes(
                            key.split("capital of")[1].trim()
                        )
                    ) {
                        console.log("Using fallback capital pattern");
                        return NextResponse.json({ completion: value });
                    }
                }
            }

            if (lastWordsLower.includes("is a") && lastWordsLower.length > 10) {
                // Try to detect what we're describing
                if (lastWordsLower.includes("javascript")) {
                    return NextResponse.json({
                        completion: " programming language",
                    });
                }
                if (lastWordsLower.includes("python")) {
                    return NextResponse.json({
                        completion: " programming language",
                    });
                }
            }
        } catch (fallbackError) {
            console.error("Fallback error handling failed:", fallbackError);
        }

        return NextResponse.json({ completion: "" });
    }
}
