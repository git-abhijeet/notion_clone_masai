const requiredEnvVars = {
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX, // Changed to match .env.local
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};

export function verifyEnvironmentVariables() {
    console.log("Verifying environment variables...");
    console.log("Environment status:", {
        hasPineconeKey: !!process.env.PINECONE_API_KEY,
        hasPineconeIndex: !!process.env.PINECONE_INDEX, // Changed to match .env.local
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
    });

    const missingVars = Object.entries(requiredEnvVars)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missingVars.length > 0) {
        console.error("Missing environment variables:", missingVars);
        throw new Error(
            `Missing required environment variables: ${missingVars.join(", ")}`
        );
    }

    console.log("Environment variables verified successfully");
    return true;
}
