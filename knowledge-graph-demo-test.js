// Knowledge Graph Demo Test Script
// Run this in the browser console to test the feature

console.log("🧠 Knowledge Graph Demo Test Starting...");

// Test 1: Check if KnowledgeGraph component is loaded
function testKnowledgeGraphComponent() {
    console.log("📊 Testing Knowledge Graph Component...");

    const generateButton = document.querySelector('button:has(svg[data-lucide="eye"])');
    if (generateButton) {
        console.log("✅ Generate Graph button found");
        return true;
    } else {
        console.log("❌ Generate Graph button not found");
        return false;
    }
}

// Test 2: Check for SVG visualization area
function testVisualizationArea() {
    console.log("🎨 Testing Visualization Area...");

    const svgElement = document.querySelector('svg');
    if (svgElement) {
        console.log("✅ SVG visualization area found");
        console.log("📏 SVG dimensions:", svgElement.getAttribute('width'), svgElement.getAttribute('height'));
        return true;
    } else {
        console.log("❌ SVG visualization area not found");
        return false;
    }
}

// Test 3: Check for control buttons
function testControlButtons() {
    console.log("🎮 Testing Control Buttons...");

    const controls = {
        zoomIn: document.querySelector('button:has(svg[data-lucide="zoom-in"])'),
        zoomOut: document.querySelector('button:has(svg[data-lucide="zoom-out"])'),
        reset: document.querySelector('button:has(svg[data-lucide="rotate-ccw"])'),
        download: document.querySelector('button:has(svg[data-lucide="download"])')
    };

    let allFound = true;
    Object.entries(controls).forEach(([name, element]) => {
        if (element) {
            console.log(`✅ ${name} button found`);
        } else {
            console.log(`❌ ${name} button not found`);
            allFound = false;
        }
    });

    return allFound;
}

// Test 4: Check for search functionality
function testSearchFunctionality() {
    console.log("🔍 Testing Search Functionality...");

    const searchInput = document.querySelector('input[placeholder*="Search nodes"]');
    if (searchInput) {
        console.log("✅ Search input found");
        return true;
    } else {
        console.log("❌ Search input not found");
        return false;
    }
}

// Run all tests
function runDemoTests() {
    console.log("🚀 Starting Knowledge Graph Demo Tests...");
    console.log("=====================================");

    const results = {
        component: testKnowledgeGraphComponent(),
        visualization: testVisualizationArea(),
        controls: testControlButtons(),
        search: testSearchFunctionality()
    };

    console.log("=====================================");
    console.log("📊 Test Results Summary:");
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const allPassed = Object.values(results).every(result => result);
    console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    if (allPassed) {
        console.log("🎉 Knowledge Graph is ready for demo!");
        console.log("💡 Next steps:");
        console.log("   1. Create some documents with related content");
        console.log("   2. Click 'Generate Graph' to create visualization");
        console.log("   3. Use search to filter nodes");
        console.log("   4. Click document nodes to navigate");
        console.log("   5. Use zoom/pan controls for better viewing");
    }

    return allPassed;
}

// Auto-run when script is loaded
if (typeof window !== 'undefined') {
    setTimeout(runDemoTests, 1000);
}

// Export for manual testing
window.knowledgeGraphDemo = {
    runTests: runDemoTests,
    testComponent: testKnowledgeGraphComponent,
    testVisualization: testVisualizationArea,
    testControls: testControlButtons,
    testSearch: testSearchFunctionality
};

console.log("💡 Demo script loaded! Run window.knowledgeGraphDemo.runTests() to test manually.");
