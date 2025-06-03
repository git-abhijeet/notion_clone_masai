// Re-indexing test script
const testReindex = async () => {
    try {
        console.log('Testing re-indexing with corrected text extraction...');

        // Get one of the existing documents and re-index it with proper text extraction
        const testDocument = {
            documentId: 'j5763crmkrh8e90n2w60k11w9h7h07qd', // This is from the Project Alpha document
            title: 'Project Alpha - Mobile App Development',
            content: `[
  {
    "id": "5691f683-3156-41d0-b598-9fb25de82c05",
    "type": "paragraph",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "# Project Alpha - Mobile App Development",
        "styles": {
          "bold": true
        }
      }
    ],
    "children": []
  },
  {
    "id": "test-stakeholder-block",
    "type": "paragraph",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "## Stakeholders",
        "styles": {
          "bold": true
        }
      }
    ],
    "children": []
  },
  {
    "id": "stakeholder-list",
    "type": "paragraph",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "- Sarah Johnson - Product Manager (Lead)",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "id": "stakeholder-list-2",
    "type": "paragraph",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "- Mike Chen - Engineering Lead",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "id": "stakeholder-list-3",
    "type": "paragraph",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "- Emily Davis - UI/UX Designer",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "id": "stakeholder-list-4",
    "type": "paragraph",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "- Alex Rodriguez - QA Manager",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "id": "stakeholder-list-5",
    "type": "paragraph",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "- Jennifer Liu - Marketing Director",
        "styles": {}
      }
    ],
    "children": []
  }
]`,
            userId: 'user_2xv888WfphpaiVffsg8RX2DfqGY'
        };

        // Re-index with the corrected text extraction
        const reindexResponse = await fetch('http://localhost:3001/api/embeddings/reindex', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                documents: [testDocument]
            })
        });

        const reindexResult = await reindexResponse.json();
        console.log('Re-index result:', JSON.stringify(reindexResult, null, 2));

        // Test vector search after re-indexing
        console.log('\nTesting vector search after re-indexing...');
        const searchResponse = await fetch('http://localhost:3001/api/vector-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: 'stakeholders Sarah Johnson Product Manager',
                topK: 3
            })
        });

        const searchResult = await searchResponse.json();
        console.log('Search result:', JSON.stringify(searchResult, null, 2));

        // Test QA after re-indexing
        console.log('\nTesting QA after re-indexing...');
        const qaResponse = await fetch('http://localhost:3001/api/ai/qa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: 'Who are the stakeholders in the project?',
                useVectorSearch: true
            })
        });

        const qaResult = await qaResponse.json();
        console.log('QA result:', JSON.stringify(qaResult, null, 2));

    } catch (error) {
        console.error('Error during testing:', error);
    }
};

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testReindex };
} else {
    // Browser usage
    testReindex();
}
