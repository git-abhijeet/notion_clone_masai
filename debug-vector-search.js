// Debug script to test vector search functionality
const fetch = require('node-fetch');

const testVectorSearch = async () => {
    try {
        console.log('Testing vector search with "stakeholders" query...');

        const response = await fetch('http://localhost:3001/api/vector-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: 'stakeholders',
                topK: 10
            })
        });

        const result = await response.json();
        console.log('Vector search response:', JSON.stringify(result, null, 2));

        // Test with a more specific query
        console.log('\nTesting with more specific query: "Sarah Johnson Product Manager"...');

        const response2 = await fetch('http://localhost:3001/api/vector-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: 'Sarah Johnson Product Manager',
                topK: 10
            })
        });

        const result2 = await response2.json();
        console.log('Specific search response:', JSON.stringify(result2, null, 2));

    } catch (error) {
        console.error('Error testing vector search:', error);
    }
};

// Test embedding generation
const testEmbedding = async () => {
    try {
        console.log('\nTesting embedding generation...');

        const response = await fetch('http://localhost:3001/api/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documentId: 'test-doc-123',
                title: 'Test Document',
                content: 'Sarah Johnson is the Product Manager. Mike Chen leads engineering.',
                action: 'index'
            })
        });

        const result = await response.json();
        console.log('Embedding response:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('Error testing embedding:', error);
    }
};

// Run tests
(async () => {
    await testVectorSearch();
    await testEmbedding();
})();
