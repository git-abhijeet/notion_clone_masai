// Test script for knowledge graph API
const testData = {
    documents: [
        {
            _id: "test_doc_1",
            title: "Introduction to Machine Learning",
            content: "This document covers the basics of machine learning, including supervised learning, unsupervised learning, and neural networks. It discusses algorithms like decision trees, support vector machines, and deep learning.",
            tags: ["AI", "ML", "Technology"],
            aiGeneratedTags: ["algorithms", "data science", "neural networks"]
        },
        {
            _id: "test_doc_2",
            title: "Deep Learning Fundamentals",
            content: "Deep learning is a subset of machine learning that uses neural networks with multiple layers. This document explains convolutional neural networks, recurrent neural networks, and transformers.",
            tags: ["deep learning", "neural networks"],
            aiGeneratedTags: ["AI", "technology", "CNN", "RNN"]
        },
        {
            _id: "test_doc_3",
            title: "Data Science Best Practices",
            content: "This guide covers best practices for data science projects, including data cleaning, feature engineering, model selection, and evaluation metrics. It also discusses Python libraries like pandas and scikit-learn.",
            tags: ["data science", "python"],
            aiGeneratedTags: ["analytics", "ML", "technology"]
        }
    ]
};

async function testKnowledgeGraphAPI() {
    try {
        console.log("Testing Knowledge Graph API...");

        const response = await fetch("http://localhost:3001/api/ai/knowledge-graph", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(testData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        console.log("✅ API Response Success!");
        console.log("📊 Graph Statistics:");
        console.log(`   - Nodes: ${result.nodes?.length || 0}`);
        console.log(`   - Links: ${result.links?.length || 0}`);
        console.log(`   - Document nodes: ${result.nodes?.filter(n => n.type === 'document').length || 0}`);
        console.log(`   - Concept nodes: ${result.nodes?.filter(n => n.type === 'concept').length || 0}`);

        console.log("\n🔗 Sample nodes:");
        result.nodes?.slice(0, 3).forEach(node => {
            console.log(`   - ${node.title} (${node.type})`);
        });

        console.log("\n🔗 Sample links:");
        result.links?.slice(0, 3).forEach(link => {
            console.log(`   - ${link.source} → ${link.target} (${link.type})`);
        });

        return result;
    } catch (error) {
        console.error("❌ API Test Failed:", error.message);
        return null;
    }
}

// Run the test
testKnowledgeGraphAPI();
