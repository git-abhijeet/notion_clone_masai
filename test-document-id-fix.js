// Test script to verify document ID handling fix
const testDocumentIds = [
    'qvxgn0d65g7y7xkdmbzbr4md4q37rbe', // Valid Convex ID format
    'project-alpha-features',          // Invalid string format (causing the error)
    'budget-overview-2023',            // Another invalid string format
    '12345'                            // Short numeric ID
];

// Simulate the isValidConvexId function
function isValidConvexId(id) {
    return /^[a-zA-Z0-9_-]{20,}$/.test(id);
}

// Test validation and display results
console.log('Testing Document ID Validation:');
console.log('------------------------------');
testDocumentIds.forEach(id => {
    const isValid = isValidConvexId(id);
    console.log(`ID: ${id}`);
    console.log(`Valid Convex ID: ${isValid}`);
    console.log(`Action: ${isValid ? 'Will navigate to document' : 'Will show error toast'}`);
    console.log('------------------------------');
});

// Simulate how document IDs are processed in the AI search component
console.log('\nSimulating AI Search Component Behavior:');
console.log('------------------------------');
testDocumentIds.forEach(id => {
    const source = { id, title: `Document: ${id}`, isValidId: isValidConvexId(id) };
    console.log(`Document: "${source.title}"`);
    console.log(`isValidId flag: ${source.isValidId}`);
    console.log(`Result: ${source.isValidId ?
        `Will navigate to /documents/${source.id}` :
        `Will show toast: Cannot open document: "${source.title}". The document ID format is not compatible.`}`);
    console.log('------------------------------');
});
