// Test to check if there are documents in the system
async function checkDocuments() {
    console.log("Checking documents in the system...");

    try {
        // First let's try to access the documents page to see if we're authenticated
        const response = await fetch("http://localhost:3002/documents", {
            method: "GET",
            credentials: "include"
        });

        console.log("Documents page response status:", response.status);

        // Let's also check if we can access any API that requires auth
        const healthResponse = await fetch("http://localhost:3002/api/test-system", {
            method: "GET",
            credentials: "include"
        });

        console.log("API health check status:", healthResponse.status);

    } catch (error) {
        console.error("Error checking documents:", error);
    }
}

checkDocuments();
