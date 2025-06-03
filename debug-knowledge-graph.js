// Debug script to test knowledge graph status
async function debugKnowledgeGraph() {
    console.log("Testing knowledge graph API...");

    try {
        // Test the API endpoint with sample data
        const testData = {
            documents: [
                {
                    _id: "test1",
                    title: "Test Document 1",
                    content: "This is a test document about artificial intelligence and machine learning."
                },
                {
                    _id: "test2",
                    title: "Test Document 2",
                    content: "This document discusses neural networks and deep learning algorithms."
                }
            ]
        };

        const response = await fetch("http://localhost:3002/api/ai/knowledge-graph", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(testData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("API Response:", result);
        console.log("Nodes count:", result.nodes?.length || 0);
        console.log("Links count:", result.links?.length || 0);

    } catch (error) {
        console.error("Error testing API:", error);
    }
}

debugKnowledgeGraph();
