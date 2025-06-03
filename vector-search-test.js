/**
 * Comprehensive Vector Search System Test Script
 * 
 * This script tests the entire vector search pipeline including text extraction,
 * embedding generation, document indexing, vector search, and RAG functionality.
 */

// Define test scenarios
const TEST_CASES = [
    {
        name: "Stakeholder Information",
        question: "Who are the stakeholders in the project?",
        expectedConfidence: 85,
        expectedSourceTitle: "Project Alpha Stakeholders",
        expectedKeywords: ["Sarah Johnson", "Mike Chen", "Emily Davis", "Alex Rodriguez", "Jennifer Liu"]
    },
    {
        name: "Key Features",
        question: "What are the key features of project alpha mobile app?",
        expectedConfidence: 85,
        expectedSourceTitle: "Project Alpha Mobile App Features",
        expectedKeywords: ["Real-time collaboration", "AI-powered task automation", "Cross-platform synchronization", "Advanced security"]
    },
    {
        name: "Budget Information",
        question: "What is the budget allocation for Project Alpha?",
        expectedConfidence: 85,
        expectedSourceTitle: "Project Alpha - Budget Documentation",
        expectedKeywords: ["$150,000", "$80,000", "53%", "$25,000", "17%", "$30,000", "20%", "$15,000", "10%"]
    }
];

// Helper to check if response contains expected keywords
function containsKeywords(response, keywords) {
    const matches = keywords.filter(keyword => response.toLowerCase().includes(keyword.toLowerCase()));
    return {
        success: matches.length > 0,
        matchCount: matches.length,
        totalKeywords: keywords.length,
        matches: matches
    };
}

// Run all tests sequentially
async function runTests() {
    console.log('🚀 Starting Vector Search System Test\n');

    const results = [];
    let successCount = 0;

    for (const test of TEST_CASES) {
        console.log(`📋 Testing: "${test.name}"`);
        console.log(`   Query: "${test.question}"`);

        try {
            // Call the QA endpoint
            const response = await fetch('http://localhost:3001/api/ai/qa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: test.question,
                    useVectorSearch: true
                })
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Check confidence
            const confidenceSuccess = result.confidence >= test.expectedConfidence;

            // Check source
            const sourceSuccess = result.sources && result.sources.some(source =>
                source.title.toLowerCase().includes(test.expectedSourceTitle.toLowerCase())
            );

            // Check keywords
            const keywordCheck = containsKeywords(result.response, test.expectedKeywords);

            // Determine overall success
            const testPassed = confidenceSuccess && sourceSuccess && keywordCheck.success;

            if (testPassed) {
                successCount++;
            }

            // Record results
            results.push({
                name: test.name,
                success: testPassed,
                confidence: result.confidence,
                confidenceSuccess,
                sourceSuccess,
                keywordCheck,
                response: result.response.substring(0, 100) + '...' // Truncate long responses
            });

            console.log(`   ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
            console.log(`   Confidence: ${result.confidence}% (Expected: ≥${test.expectedConfidence}%)`);
            console.log(`   Keywords Found: ${keywordCheck.matchCount}/${keywordCheck.totalKeywords}`);
            console.log(`   Source Found: ${sourceSuccess ? 'Yes' : 'No'}\n`);

        } catch (error) {
            console.error(`   ❌ ERROR: ${error.message}`);
            results.push({
                name: test.name,
                success: false,
                error: error.message
            });
        }
    }

    // Print summary
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    console.log(`Total Tests: ${TEST_CASES.length}`);
    console.log(`Passed: ${successCount}`);
    console.log(`Failed: ${TEST_CASES.length - successCount}`);
    console.log(`Success Rate: ${(successCount / TEST_CASES.length * 100).toFixed(0)}%`);
    console.log('\n');

    return {
        testCount: TEST_CASES.length,
        successCount,
        failureCount: TEST_CASES.length - successCount,
        results
    };
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests };
} else {
    // Browser execution
    runTests().then(summary => {
        console.log('Tests completed!');
    }).catch(error => {
        console.error('Test execution failed:', error);
    });
}
