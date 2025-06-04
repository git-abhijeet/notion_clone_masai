# Pinecone Database Clear Scripts

This directory contains scripts to completely clear your Pinecone vector database. **Use with extreme caution as this operation cannot be undone!**

## 🗑️ Available Scripts

### 1. Node.js Script (Cross-platform)

```bash
node scripts/clear-pinecone-db.js [options]
```

**Options:**

-   `--confirm` - Skip confirmation prompt but show summary
-   `--force` - Force deletion without any prompts
-   `--dry-run` - Preview what would be deleted without deleting
-   `--help` - Show help message

### 2. PowerShell Script (Windows)

```powershell
.\scripts\Clear-PineconeDB.ps1 [-Force] [-DryRun] [-Help]
```

### 3. Batch File (Windows - Simplest)

```cmd
scripts\clear-pinecone.bat
```

## ⚠️ WARNINGS

### **DESTRUCTIVE OPERATION**

-   This will **permanently delete ALL vectors** from your Pinecone index
-   This action **CANNOT be undone**
-   All document embeddings will be lost
-   You will need to **re-index all documents** after clearing

### **Data Loss Prevention**

-   Always run with `--dry-run` first to see what will be deleted
-   Make sure you have a backup strategy if needed
-   Consider if you really need to clear everything vs. deleting specific documents

## 🚀 Usage Examples

### Safe Preview (Recommended First Step)

```bash
# See what would be deleted without actually deleting
node scripts/clear-pinecone-db.js --dry-run
```

### Interactive Deletion

```bash
# Will prompt for confirmation
node scripts/clear-pinecone-db.js
```

### Force Deletion (Automated)

```bash
# No prompts - USE WITH EXTREME CAUTION
node scripts/clear-pinecone-db.js --force
```

### Windows Batch File

```cmd
# Double-click or run from command prompt
scripts\clear-pinecone.bat
```

## 📋 Prerequisites

1. **Node.js** installed on your system
2. **Environment variables** configured in `.env.local`:
    ```env
    PINECONE_API_KEY=your_pinecone_api_key_here
    PINECONE_INDEX_NAME=notion-clone
    ```
3. **Dependencies installed**: `npm install`

## 🔍 What the Script Does

1. **Validates environment** - Checks for required API keys and configuration
2. **Connects to Pinecone** - Establishes connection to your index
3. **Shows current stats** - Displays how many vectors will be deleted
4. **Requests confirmation** - Asks for explicit confirmation (unless `--force`)
5. **Deletes all vectors** - Removes all vectors from all namespaces
6. **Verifies deletion** - Confirms the index is empty
7. **Shows summary** - Reports on what was deleted

## 📊 Sample Output

```
🗑️  Pinecone Database Clear Script
=====================================

🔍 Validating environment...
✅ Environment validated
   API Key: sk-proj-Ab...
   Index: notion-clone

📊 Connecting to Pinecone...
✅ Connected to Pinecone successfully

📈 Getting index statistics...
📊 Current Index Statistics:
   Total Vectors: 1,250
   Dimensions: 768
   Index Fullness: 0.05%

⚠️  WARNING: DESTRUCTIVE OPERATION
=====================================
This will permanently delete ALL 1,250 vectors from:
   Index: notion-clone
   This action CANNOT be undone!

🗑️  Deleting 1,250 vectors from Pinecone...
✅ Successfully deleted all vectors!
   Vectors deleted: 1,250
   Time taken: 2,341ms

🔍 Verifying deletion...
✅ Verification successful - index is empty

🎉 Pinecone database cleared successfully!
```

## 🔄 After Clearing the Database

Once you've cleared your Pinecone database, you'll need to re-index your documents:

### 1. Using the UI

-   Navigate to `/ai-features` in your application
-   Click the "Index Documents" button
-   Wait for bulk indexing to complete

### 2. Using the API

```javascript
// Bulk re-index all documents
const response = await fetch("/api/embeddings/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        documents: yourDocuments, // Array of documents to re-index
        userId: "your-user-id",
    }),
});
```

### 3. Using Individual Indexing

```javascript
// Index documents one by one
for (const doc of documents) {
    await fetch("/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            documentId: doc.id,
            title: doc.title,
            content: doc.content,
            userId: doc.userId,
        }),
    });
}
```

## 🛟 Troubleshooting

### Script Won't Run

-   Ensure Node.js is installed: `node --version`
-   Check you're in the project root directory
-   Verify `.env.local` file exists with proper API keys

### Connection Errors

-   Verify your `PINECONE_API_KEY` is correct
-   Check your `PINECONE_INDEX_NAME` matches your actual index
-   Ensure your Pinecone index exists and is active

### Permission Errors

-   Make sure your Pinecone API key has delete permissions
-   Check if your index is in a different environment

### Verification Fails

-   This is normal - Pinecone deletions can take time to propagate
-   Wait a few minutes and check the index stats manually
-   The vectors are deleted even if verification shows remaining counts

## 🔐 Security Notes

-   Never commit these scripts with hardcoded API keys
-   Keep your `.env.local` file secure and never commit it
-   Consider using different API keys for production vs. development
-   Be extra careful when running in production environments

---

**Remember: These scripts are powerful tools for database management. Always double-check your environment and use `--dry-run` first!**
