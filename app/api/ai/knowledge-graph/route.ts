import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface Document {
    _id: string;
    title: string;
    content?: string;
    tags?: string[];
    aiGeneratedTags?: string[];
}

interface Node {
    id: string;
    title: string;
    group: number;
    size: number;
    type: string;
}

interface Link {
    source: string;
    target: string;
    strength: number;
    type: string;
}

// Helper function to create a simple fallback graph when API fails
function createFallbackGraph(docs: Document[]): {
    nodes: Node[];
    links: Link[];
} {
    // Create document nodes
    const docNodes = docs.map((doc, index) => ({
        id: doc._id,
        title: doc.title || "Untitled",
        group: Math.floor(index / 2) + 1,
        size: 15,
        type: "document",
    }));

    // Create concept nodes from tags
    const conceptNodes: Node[] = [];
    const allTags = new Set<string>();

    docs.forEach((doc) => {
        (doc.tags || []).forEach((tag) => allTags.add(tag));
        (doc.aiGeneratedTags || []).forEach((tag) => allTags.add(tag));
    });

    Array.from(allTags)
        .slice(0, 3)
        .forEach((tag, index) => {
            conceptNodes.push({
                id: `concept_${index}`,
                title: tag,
                group: 5,
                size: 10,
                type: "concept",
            });
        });

    // Create links
    const links: Link[] = [];

    // Add some document-to-document links
    if (docs.length >= 2) {
        links.push({
            source: docs[0]._id,
            target: docs[1]._id,
            strength: 0.7,
            type: "related",
        });
    }

    // Add document-to-concept links
    if (conceptNodes.length > 0 && docs.length > 0) {
        links.push({
            source: docs[0]._id,
            target: conceptNodes[0].id,
            strength: 0.8,
            type: "contains",
        });
    }

    return {
        nodes: [...docNodes, ...conceptNodes],
        links,
    };
}

export async function POST(req: NextRequest) {
    try {
        const { documents }: { documents: Document[] } = await req.json();

        if (!documents || documents.length === 0) {
            console.log("No documents provided to knowledge graph API");
            return NextResponse.json({ nodes: [], links: [] });
        }

        // Limit documents to avoid token limits and ensure we have content
        const limitedDocs = documents
            .filter((doc) => doc.content && doc.content.length > 50)
            .slice(0, 15);

        if (limitedDocs.length === 0) {
            console.log(
                "No valid documents with content found for knowledge graph"
            );
            // Generate minimal fallback graph data
            const fallbackData = createFallbackGraph(documents.slice(0, 5));
            return NextResponse.json(fallbackData);
        }

        console.log(
            `Processing ${limitedDocs.length} documents for knowledge graph`
        );
        const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `You are an expert knowledge graph analyst. Your task is to analyze documents and create a meaningful knowledge graph that shows relationships between concepts, topics, and documents.

Create a comprehensive knowledge graph with:
1. Document nodes representing the actual documents
2. Concept nodes representing key topics/themes found across documents
3. Meaningful relationships between documents and concepts

Return ONLY valid JSON in this exact format:
{
  "nodes": [
    {"id": "doc_id", "title": "Document Title", "group": 1, "size": 15, "type": "document"},
    {"id": "concept_1", "title": "Concept Name", "group": 2, "size": 10, "type": "concept"}
  ],
  "links": [
    {"source": "doc_id", "target": "concept_1", "strength": 0.8, "type": "contains"},
    {"source": "doc_1", "target": "doc_2", "strength": 0.6, "type": "related"}
  ]
}

Rules:
- Use actual document IDs provided
- Group similar documents/concepts (groups 1-5)
- Size: documents 10-25 (based on content length), concepts 5-15 (based on frequency)
- Strength: 0.3-1.0 (higher for stronger relationships)
- Link types: "contains" (doc->concept), "related" (doc->doc), "shares" (doc->concept)
- Only create links for genuine, meaningful relationships
- Limit to most important concepts to keep graph readable

Analyze these documents and create a knowledge graph:

${limitedDocs
    .map(
        (doc, index) =>
            `${index + 1}. Document ID: ${doc._id}
   Title: "${doc.title}"
   Content: ${doc.content?.substring(0, 400)}${doc.content && doc.content.length > 400 ? "..." : ""}
   Tags: ${doc.tags?.join(", ") || "None"}
   AI Tags: ${doc.aiGeneratedTags?.join(", ") || "None"}
   
`
    )
    .join("")}

Focus on identifying:
1. Shared concepts and themes across documents
2. Related documents that discuss similar topics
3. Key concepts that appear in multiple documents
4. Hierarchical relationships between topics`,
                            },
                        ],
                    },
                ],
            }),
        });
        if (!response.ok) {
            console.error(
                `Gemini API error: ${response.status} ${response.statusText}`
            );
            console.log("Using fallback graph generation");
            return NextResponse.json(createFallbackGraph(limitedDocs));
        }

        const geminiResponse = await response.json();
        const responseContent =
            geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseContent) {
            console.error("No content in Gemini API response");
            return NextResponse.json(createFallbackGraph(limitedDocs));
        }

        let graphData: { nodes: Node[]; links: Link[] } = {
            nodes: [],
            links: [],
        };
        try {
            // Handle both raw JSON and markdown-wrapped JSON
            let cleanedContent = responseContent.trim();

            // Remove markdown code block wrapper if present
            if (cleanedContent.startsWith("```json")) {
                cleanedContent = cleanedContent
                    .replace(/^```json\s*/, "")
                    .replace(/\s*```$/, "");
            } else if (cleanedContent.startsWith("```")) {
                cleanedContent = cleanedContent
                    .replace(/^```\s*/, "")
                    .replace(/\s*```$/, "");
            }

            graphData = JSON.parse(cleanedContent);

            // Validate and clean the graph data
            if (graphData.nodes && Array.isArray(graphData.nodes)) {
                graphData.nodes = graphData.nodes.filter(
                    (node: Node) =>
                        node.id &&
                        node.title &&
                        typeof node.group === "number" &&
                        typeof node.size === "number"
                );
            } else {
                console.warn("Missing or invalid nodes in API response");
                throw new Error("Invalid graph structure in API response");
            }

            if (graphData.links && Array.isArray(graphData.links)) {
                const nodeIds = new Set(graphData.nodes.map((n: Node) => n.id));
                graphData.links = graphData.links.filter(
                    (link: Link) =>
                        nodeIds.has(link.source) &&
                        nodeIds.has(link.target) &&
                        typeof link.strength === "number" &&
                        link.strength >= 0.3 &&
                        link.strength <= 1.0
                );
            } else {
                console.warn("Missing or invalid links in API response");
                graphData.links = [];
            }

            // Ensure we have nodes and at least some connections
            if (graphData.nodes.length === 0) {
                throw new Error("No valid nodes in API response");
            }
        } catch (parseError) {
            console.error(
                "Failed to parse knowledge graph response:",
                parseError
            );
            console.error("Raw response:", responseContent);
            // Fallback: create a meaningful graph from documents with connections
            const fallbackNodes = limitedDocs.map((doc, index) => ({
                id: doc._id,
                title: doc.title,
                group: Math.floor(index / 3) + 1,
                size: Math.min(
                    Math.max((doc.content?.length || 0) / 50, 10),
                    25
                ),
                type: "document",
            }));

            // Add some concept nodes based on tags
            const conceptNodes: Node[] = [];
            const allTags = new Set<string>();

            limitedDocs.forEach((doc) => {
                doc.tags?.forEach((tag) => allTags.add(tag));
                doc.aiGeneratedTags?.forEach((tag) => allTags.add(tag));
            });

            Array.from(allTags)
                .slice(0, 5)
                .forEach((tag, index) => {
                    conceptNodes.push({
                        id: `concept_${index}`,
                        title: tag,
                        group: 5,
                        size: 8,
                        type: "concept",
                    });
                });

            // Create links between documents and concepts
            const fallbackLinks: Link[] = [];

            // Connect documents to concepts based on tags
            limitedDocs.forEach((doc) => {
                const docTags = [
                    ...(doc.tags || []),
                    ...(doc.aiGeneratedTags || []),
                ];
                conceptNodes.forEach((conceptNode) => {
                    if (docTags.includes(conceptNode.title)) {
                        fallbackLinks.push({
                            source: doc._id,
                            target: conceptNode.id,
                            strength: 0.7,
                            type: "contains",
                        });
                    }
                });
            });

            // Add some connections between documents if they share tags
            for (let i = 0; i < limitedDocs.length; i++) {
                for (let j = i + 1; j < limitedDocs.length; j++) {
                    const doc1Tags = [
                        ...(limitedDocs[i].tags || []),
                        ...(limitedDocs[i].aiGeneratedTags || []),
                    ];
                    const doc2Tags = [
                        ...(limitedDocs[j].tags || []),
                        ...(limitedDocs[j].aiGeneratedTags || []),
                    ];

                    const sharedTags = doc1Tags.filter((tag) =>
                        doc2Tags.includes(tag)
                    );
                    if (sharedTags.length > 0) {
                        fallbackLinks.push({
                            source: limitedDocs[i]._id,
                            target: limitedDocs[j]._id,
                            strength: Math.min(sharedTags.length * 0.3, 0.8),
                            type: "related",
                        });
                    }
                }
            }

            graphData = {
                nodes: [...fallbackNodes, ...conceptNodes],
                links: fallbackLinks,
            };
        }

        return NextResponse.json(graphData);
    } catch (error) {
        console.error("Knowledge graph error:", error);
        // Try to create a fallback even when an error occurs
        try {
            const { documents } = await req.json();
            if (documents && documents.length > 0) {
                console.log("Using fallback graph generation due to error");
                return NextResponse.json(
                    createFallbackGraph(documents.slice(0, 5))
                );
            }
        } catch (fallbackError) {
            console.error("Fallback graph creation failed:", fallbackError);
        }

        return NextResponse.json({ nodes: [], links: [] }, { status: 500 });
    }
}
