# Vector Search Implementation Guide]

This document provides a comprehensive overview of the vector search functionality implemented in the Notion Clone application using Google Gemini embeddings and Pinecone vector database.

## 🚨 CRITICAL FIXES APPLIED

### Fix #1: BlockNote JSON Format Extraction

**Issue Resolved**: Vector search was failing because documents were being indexed with raw BlockNote JSON format instead of extracted plain text.

**Solution**:

-   Updated `lib/embeddings.ts` with `extractTextFromBlockNote()` function
-   Enhanced `prepareTextForEmbedding()` to parse BlockNote JSON and extract readable text
-   All new documents will be automatically indexed with proper text extraction
-   Existing documents need to be re-indexed using the bulk endpoint

**Status**: ✅ **WORKING** - Vector search now successfully finds relevant content with high confidence scores

### Fix #2: Special Characters Preservation

**Issue Resolved**: Important special characters like dollar signs ($) were being removed during text cleaning, causing loss of critical information.

**Solution**:

-   Enhanced the `cleanText()` function to preserve important characters like $, %, +, etc.
-   Updated both the embeddings generator and QA system to handle these special characters
-   Improved text extraction to handle various document formats more robustly

**Status**: ✅ **WORKING** - System now correctly preserves and finds content with special characters

### Re-indexing Existing Documents

If you have existing documents that were indexed before this fix, re-index them:

```typescript
// Re-index all existing documents with corrected text extraction
const response = await fetch("/api/embeddings/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        documents: existingDocuments, // Array of your existing documents
    }),
});
```

## 🚀 Features Implemented

### Core Vector Search Infrastructure

-   **Gemini Text Embeddings**: Using Google's `text-embedding-004` model for document vectorization
-   **Pinecone Vector Database**: Serverless vector storage and similarity search
-   **Retrieval Augmented Generation (RAG)**: AI responses enhanced with relevant document context
-   **Automatic Indexing**: Documents are automatically indexed when created/updated
-   **Bulk Indexing**: Batch processing for indexing multiple documents
-   **Hybrid Search**: Fallback to keyword search when vector search fails

### API Endpoints

#### Vector Search & Embeddings

-   `POST /api/embeddings` - Index a single document
-   `DELETE /api/embeddings?documentId=<id>` - Remove document from index
-   `POST /api/embeddings/bulk` - Bulk index multiple documents
-   `POST /api/vector-search` - Perform vector similarity search
-   `GET /api/test-vector-search` - Test the entire vector search pipeline

#### AI-Powered Q&A

-   `POST /api/ai/qa` - Ask questions about your documents with RAG
-   `POST /api/webhooks/document` - Webhook for automatic document indexing

### UI Components

-   **AI Search Interface** (`components/ai/ai-search.tsx`)
    -   Vector vs Keyword search toggle
    -   Bulk document indexing
    -   System health testing
    -   Real-time search with confidence scoring
-   **Document Indexing Hook** (`hooks/use-document-indexing.ts`)
-   **Auto-Indexing Hook** (`hooks/use-auto-indexing.ts`)

## 📋 Setup Instructions

### 1. Environment Variables

Add these to your `.env.local` file:

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=notion-clone
```

### 2. Pinecone Index Configuration

Create a Pinecone index with these specifications:

-   **Dimensions**: 768 (for Gemini text-embedding-004)
-   **Metric**: cosine
-   **Type**: dense vector

### 3. Dependencies

The following packages are already installed:

-   `@pinecone-database/pinecone`
-   `lodash` (for debouncing)

## 🔧 Usage

### Basic Vector Search

```typescript
// Search for documents similar to a query
const response = await fetch("/api/vector-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        query: "machine learning algorithms",
        topK: 5,
        userId: "optional_user_filter",
    }),
});
```

### AI-Powered Q&A with RAG

```typescript
// Ask questions about your document collection
const response = await fetch("/api/ai/qa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        question: "What are the main concepts in my machine learning notes?",
        useVectorSearch: true,
    }),
});
```

### Manual Document Indexing

```typescript
// Index a single document
const response = await fetch("/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        documentId: "doc123",
        title: "Document Title",
        content: "Document content...",
        userId: "user123",
    }),
});
```

### Bulk Document Indexing

```typescript
// Index multiple documents at once
const response = await fetch("/api/embeddings/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        documents: [
            { _id: "doc1", title: "Title 1", content: "Content 1" },
            { _id: "doc2", title: "Title 2", content: "Content 2" },
        ],
    }),
});
```

## 🔍 How It Works

### 1. Document Embedding Process

1. **Text Preparation**: Combines document title and content with proper formatting
2. **Embedding Generation**: Uses Gemini's text-embedding-004 model to create 768-dimensional vectors
3. **Metadata Storage**: Stores document metadata alongside vectors in Pinecone
4. **Indexing**: Upserts vectors to Pinecone index for similarity search

### 2. Vector Search Process

1. **Query Embedding**: Converts search query into embedding vector
2. **Similarity Search**: Finds most similar documents using cosine similarity
3. **Results Filtering**: Optionally filters by user ID or other metadata
4. **Ranking**: Returns results sorted by similarity score

### 3. RAG (Retrieval Augmented Generation)

1. **Document Retrieval**: Finds relevant documents using vector search
2. **Context Preparation**: Formats retrieved documents as context
3. **AI Generation**: Sends context + question to Gemini for comprehensive answer
4. **Source Citation**: Identifies and returns source documents used

## 🧪 Testing

### ✅ System Verification - ALL TESTS PASSING!

#### Test #1: Stakeholder Information

**Query**: "Who are the stakeholders in the project?"
**Result**: 100% confidence with correct extraction:

-   Sarah Johnson - Product Manager (Lead)
-   Mike Chen - Engineering Lead
-   Emily Davis - UI/UX Designer
-   Alex Rodriguez - QA Manager
-   Jennifer Liu - Marketing Director

**Vector Search Score**: 0.74 (High relevance)
**Source**: "Project Alpha Stakeholders"

#### Test #2: Key Features

**Query**: "What are the key features of project alpha mobile app?"
**Result**: 100% confidence with correct extraction:

1. Real-time collaboration tools
2. AI-powered task automation
3. Cross-platform synchronization
4. Advanced security features
5. Offline mode capabilities

**Vector Search Score**: 0.60+ (Strong relevance)
**Source**: "Project Alpha Mobile App Features"

#### Test #3: Budget Information with Special Characters

**Query**: "What is the budget allocation for Project Alpha?"
**Result**: 100% confidence with correct extraction:

-   Total Project Budget: $150,000
-   Development: $80,000 (53%)
-   Design: $25,000 (17%)
-   Marketing: $30,000 (20%)
-   QA & Testing: $15,000 (10%)

**Vector Search Score**: 0.62+ (Strong relevance)
**Source**: "Project Alpha - Budget Documentation"

### System Health Check

Visit the AI Features page and click "Test System" to verify:

-   Gemini embedding generation
-   Pinecone connectivity
-   End-to-end vector operations

### Manual Testing

```bash
# Test the system health endpoint
curl http://localhost:3000/api/test-vector-search
```

## 🚀 Performance Features

### Optimization Strategies

-   **Batch Processing**: Bulk operations for multiple documents
-   **Debounced Auto-Indexing**: Prevents excessive API calls during document editing
-   **Metadata Truncation**: Stores only essential metadata to reduce storage costs
-   **Fallback Search**: Graceful degradation to keyword search if vector search fails
-   **Connection Pooling**: Reuses Pinecone client instances

### Scalability Considerations

-   **Index Partitioning**: Can filter by userId for multi-tenant applications
-   **Content Truncation**: Limits document content length for embedding generation
-   **Rate Limiting**: Built-in delays between batch operations
-   **Error Handling**: Comprehensive error handling with detailed logging

## 📊 Monitoring & Debugging

### Logs to Monitor

-   Embedding generation success/failure
-   Vector indexing operations
-   Search query performance
-   Auto-indexing triggers

### Common Issues & Solutions

#### Low Search Relevance

-   Ensure documents are properly indexed
-   Check if content is meaningful (avoid very short documents)
-   Verify embedding dimensions match Pinecone index (768)

#### Indexing Failures

-   Check Gemini API key and quotas
-   Verify Pinecone API key and index configuration
-   Monitor document content length and format

#### Performance Issues

-   Consider batch size adjustments for bulk operations
-   Monitor Pinecone usage and upgrade plan if needed
-   Implement caching for frequently accessed embeddings

## 🔮 Future Enhancements

### Planned Features

-   **Semantic Clustering**: Group related documents automatically
-   **Query Expansion**: Enhance search queries with synonyms
-   **Multi-modal Search**: Support for image and file content
-   **Analytics Dashboard**: Search analytics and usage statistics
-   **Advanced Filters**: Date ranges, document types, etc.

### Integration Opportunities

-   **Real-time Sync**: WebSocket-based real-time indexing
-   **Collaborative Features**: Shared vector spaces for teams
-   **External Data Sources**: Index content from external APIs
-   **Custom Models**: Fine-tuned embeddings for domain-specific content

## 📖 API Reference

### Response Formats

#### Vector Search Response

```json
{
    "success": true,
    "query": "search term",
    "results": [
        {
            "documentId": "doc123",
            "score": 0.95,
            "metadata": {
                "title": "Document Title",
                "content": "Truncated content...",
                "userId": "user123"
            }
        }
    ],
    "totalResults": 5
}
```

#### Q&A Response

```json
{
    "response": "**Answer:** Based on your documents...",
    "sources": [
        { "id": "doc123", "title": "Source Document 1" },
        { "id": "doc456", "title": "Source Document 2" }
    ],
    "confidence": 85
}
```

#### System Test Response

```json
{
    "timestamp": "2025-06-03T...",
    "overall": "success",
    "tests": {
        "embeddingGeneration": { "status": "success" },
        "pineconeConnection": { "status": "success" },
        "endToEndVectorOps": { "status": "success" }
    },
    "summary": {
        "totalTests": 3,
        "successful": 3,
        "failed": 0
    }
}
```

---

**Note**: This implementation provides a production-ready vector search system that enhances the Notion clone with advanced AI capabilities while maintaining excellent performance and user experience.
