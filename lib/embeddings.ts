const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_EMBEDDING_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

export interface EmbeddingResponse {
    embedding: {
        values: number[];
    };
}

export async function generateEmbedding(text: string): Promise<number[]> {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
    }

    try {
        const response = await fetch(
            `${GEMINI_EMBEDDING_URL}?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "models/text-embedding-004",
                    content: {
                        parts: [{ text }],
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Gemini API error: ${response.status} - ${errorText}`
            );
        }

        const data: EmbeddingResponse = await response.json();
        return data.embedding.values;
    } catch (error) {
        console.error("Error generating embedding:", error);
        throw error;
    }
}

/**
 * Extract plain text from BlockNote JSON format with enhanced robustness
 * for different document structures
 */
function extractTextFromBlockNote(blockData: any): string {
    // Handle direct string input
    if (typeof blockData === "string") {
        return blockData;
    }

    // Handle null or undefined
    if (!blockData) {
        return "";
    }

    // Convert non-array objects to array if needed
    const blocks = Array.isArray(blockData) ? blockData : [blockData];
    const textParts: string[] = [];

    for (const block of blocks) {
        if (!block || typeof block !== "object") continue;

        // Direct text property (some formats use this)
        if (typeof block.text === "string") {
            textParts.push(block.text);
            continue;
        }

        // Handle Markdown formatting that may be embedded
        if (typeof block.content === "string") {
            textParts.push(block.content);
            continue;
        }

        // Extract text from content array (BlockNote standard)
        if (block.content && Array.isArray(block.content)) {
            for (const contentItem of block.content) {
                // Handle direct string in content array
                if (typeof contentItem === "string") {
                    textParts.push(contentItem);
                    continue;
                }

                // Handle text property in content items
                if (contentItem && contentItem.text) {
                    textParts.push(contentItem.text);
                }

                // Handle different content item structures
                if (
                    contentItem &&
                    contentItem.type === "text" &&
                    contentItem.text
                ) {
                    textParts.push(contentItem.text);
                }
            }
        }

        // Recursively extract from children
        if (block.children && Array.isArray(block.children)) {
            const childrenText = extractTextFromBlockNote(block.children);
            if (childrenText) {
                textParts.push(childrenText);
            }
        }

        // Handle props that might contain text in some formats
        if (block.props && typeof block.props === "object") {
            Object.values(block.props).forEach((prop) => {
                if (typeof prop === "string") {
                    textParts.push(prop);
                }
            });
        }
    }

    return textParts.join(" ").trim();
}

/**
 * Clean and normalize text for better embedding quality
 * while preserving important characters
 */
function cleanText(text: string): string {
    if (!text) return "";

    // Replace multiple whitespaces, newlines, tabs with single space
    let cleaned = text.replace(/\s+/g, " ");

    // Preserve dollar signs, percentage and other important characters
    // Only remove characters that truly don't add semantic meaning
    cleaned = cleaned.replace(/[^\w\s.,;:!?'"()[\]{}\-$%+=#@]/g, " ");

    // Normalize multiple spaces again
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    return cleaned;
}

/**
 * Identifies if content might be in Markdown format
 */
function isMarkdown(content: string): boolean {
    // Check for common Markdown patterns
    const markdownPatterns = [
        /^#+ /m, // Headers
        /\*\*.*?\*\*/, // Bold
        /\*.*?\*/, // Italic
        /^- /m, // Unordered lists
        /^[0-9]+\. /m, // Ordered lists
        /\[.*?\]\(.*?\)/, // Links
        /^>/m, // Blockquotes
        /^```[\s\S]*?```/m, // Code blocks
        /`.*?`/, // Inline code
    ];

    return markdownPatterns.some((pattern) => pattern.test(content));
}

export function prepareTextForEmbedding(
    title: string,
    content: string
): string {
    // Handle empty content
    if (!content || content.trim().length === 0) {
        return `Title: ${title}\n\nContent: [No content]`;
    }

    let extractedContent = content;

    // Try JSON parsing first (BlockNote format)
    try {
        const parsedContent = JSON.parse(content);
        extractedContent = extractTextFromBlockNote(parsedContent);
        console.log("Successfully extracted text from BlockNote JSON format");
    } catch (error) {
        // Not JSON, could be plain text, Markdown, or other format
        if (isMarkdown(content)) {
            console.log(
                "Content appears to be in Markdown format, using as-is"
            );
            extractedContent = content;
        } else {
            console.log("Content is not JSON or Markdown, using as-is");
        }
    }

    // Clean the extracted content
    extractedContent = cleanText(extractedContent);

    // Skip empty or very short extractions
    if (extractedContent.length < 10) {
        console.log(
            "Extracted content too short, falling back to original content"
        );
        extractedContent = cleanText(content);
    }

    // Combine title and content, with title given more weight
    const preparedText = `Title: ${title}\n\nContent: ${extractedContent}`;

    // Truncate to reasonable length for embedding (Gemini has token limits)
    const maxLength = 8000; // Conservative limit
    return preparedText.length > maxLength
        ? preparedText.substring(0, maxLength) + "..."
        : preparedText;
}
