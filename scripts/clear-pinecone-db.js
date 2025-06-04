#!/usr/bin/env node

/**
 * Pinecone Database Clear Script
 * 
 * This script will delete ALL vectors from your Pinecone index.
 * Use with caution as this operation cannot be undone!
 * 
 * Usage:
 *   node scripts/clear-pinecone-db.js
 *   node scripts/clear-pinecone-db.js --confirm
 *   node scripts/clear-pinecone-db.js --force
 * 
 * Options:
 *   --confirm   Skip confirmation prompt
 *   --force     Force deletion without any prompts
 *   --dry-run   Show what would be deleted without actually deleting
 *   --help      Show this help message
 */

// Try to load dependencies with better error handling
let Pinecone, readline, dotenv;

try {
    ({ Pinecone } = require('@pinecone-database/pinecone'));
    readline = require('readline');
    dotenv = require('dotenv');

    // Load environment variables
    dotenv.config({ path: '.env.local' });
} catch (error) {
    console.error('❌ Failed to load required dependencies:');
    console.error('   Error:', error.message);
    console.error('\n💡 Please ensure you have installed dependencies:');
    console.error('   npm install @pinecone-database/pinecone dotenv');
    process.exit(1);
}

// Configuration
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX || 'notion-clone';

// Command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForced = args.includes('--force');
const isConfirmed = args.includes('--confirm');
const showHelp = args.includes('--help');

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function showHelpMessage() {
    log('\n🗑️  Pinecone Database Clear Script', 'bold');
    log('=====================================\n', 'cyan');

    log('This script will delete ALL vectors from your Pinecone index.', 'yellow');
    log('⚠️  WARNING: This operation cannot be undone!\n', 'red');

    log('Usage:', 'bold');
    log('  node scripts/clear-pinecone-db.js              # Interactive mode');
    log('  node scripts/clear-pinecone-db.js --confirm    # Skip confirmation');
    log('  node scripts/clear-pinecone-db.js --force      # Force without prompts');
    log('  node scripts/clear-pinecone-db.js --dry-run    # Preview only');
    log('  node scripts/clear-pinecone-db.js --help       # Show this help\n');

    log('Options:', 'bold');
    log('  --confirm   Skip confirmation prompt but show summary');
    log('  --force     Force deletion without any prompts');
    log('  --dry-run   Show what would be deleted without deleting');
    log('  --help      Show this help message\n');

    log('Environment Variables Required:', 'bold');
    log('  PINECONE_API_KEY     Your Pinecone API key');
    log('  PINECONE_INDEX_NAME  Index name (default: notion-clone)\n');
}

async function validateEnvironment() {
    log('🔍 Validating environment...', 'cyan');

    if (!PINECONE_API_KEY) {
        log('❌ PINECONE_API_KEY not found in environment variables', 'red');
        log('   Please add it to your .env.local file', 'yellow');
        return false;
    }

    if (!PINECONE_INDEX_NAME) {
        log('❌ PINECONE_INDEX_NAME not found', 'red');
        return false;
    }

    log(`✅ Environment validated`, 'green');
    log(`   API Key: ${PINECONE_API_KEY.substring(0, 10)}...`, 'blue');
    log(`   Index: ${PINECONE_INDEX_NAME}`, 'blue');

    return true;
}

async function connectToPinecone() {
    log('\n📊 Connecting to Pinecone...', 'cyan');

    try {
        const pinecone = new Pinecone({
            apiKey: PINECONE_API_KEY
        });

        const index = pinecone.index(PINECONE_INDEX_NAME);

        log('✅ Connected to Pinecone successfully', 'green');
        return { pinecone, index };
    } catch (error) {
        log(`❌ Failed to connect to Pinecone: ${error.message}`, 'red');
        throw error;
    }
}

async function getIndexStats(index) {
    log('\n📈 Getting index statistics...', 'cyan');

    try {
        const stats = await index.describeIndexStats();

        log('📊 Current Index Statistics:', 'bold');
        log(`   Total Vectors: ${stats.totalRecordCount || 0}`, 'blue');
        log(`   Dimensions: ${stats.dimension || 'Unknown'}`, 'blue');
        log(`   Index Fullness: ${((stats.indexFullness || 0) * 100).toFixed(2)}%`, 'blue');

        if (stats.namespaces) {
            log('   Namespaces:', 'blue');
            Object.entries(stats.namespaces).forEach(([namespace, data]) => {
                log(`     ${namespace}: ${data.recordCount || 0} vectors`, 'blue');
            });
        }

        return stats;
    } catch (error) {
        log(`❌ Failed to get index stats: ${error.message}`, 'red');
        throw error;
    }
}

async function promptUser(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase().trim());
        });
    });
}

async function deleteAllVectors(index, stats, isDryRun = false) {
    const totalVectors = stats.totalRecordCount || 0;

    if (totalVectors === 0) {
        log('\n✅ Index is already empty - nothing to delete', 'green');
        return { success: true, deletedCount: 0 };
    }

    if (isDryRun) {
        log('\n🔍 DRY RUN - The following would be deleted:', 'yellow');
        log(`   ${totalVectors} vectors would be deleted`, 'yellow');
        log(`   Index would be completely cleared`, 'yellow');
        return { success: true, deletedCount: 0, dryRun: true };
    }

    log(`\n🗑️  Deleting ${totalVectors} vectors from Pinecone...`, 'cyan');

    try {
        const startTime = Date.now();

        // Delete all vectors in the default namespace
        await index.deleteAll();

        // If there are other namespaces, delete them too
        if (stats.namespaces && Object.keys(stats.namespaces).length > 1) {
            for (const namespace of Object.keys(stats.namespaces)) {
                if (namespace !== '') {  // Skip default namespace (already deleted)
                    log(`   Deleting namespace: ${namespace}`, 'yellow');
                    await index.deleteAll(namespace);
                }
            }
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        log(`✅ Successfully deleted all vectors!`, 'green');
        log(`   Vectors deleted: ${totalVectors}`, 'green');
        log(`   Time taken: ${duration}ms`, 'green');

        return {
            success: true,
            deletedCount: totalVectors,
            duration
        };

    } catch (error) {
        log(`❌ Failed to delete vectors: ${error.message}`, 'red');
        throw error;
    }
}

async function verifyDeletion(index) {
    log('\n🔍 Verifying deletion...', 'cyan');

    try {
        // Wait a moment for the deletion to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));

        const stats = await index.describeIndexStats();
        const remainingVectors = stats.totalRecordCount || 0;

        if (remainingVectors === 0) {
            log('✅ Verification successful - index is empty', 'green');
            return true;
        } else {
            log(`⚠️  Warning: ${remainingVectors} vectors still remain`, 'yellow');
            log('   This might be due to propagation delay', 'yellow');
            return false;
        }
    } catch (error) {
        log(`❌ Failed to verify deletion: ${error.message}`, 'red');
        return false;
    }
}

async function main() {
    try {
        // Show help if requested
        if (showHelp) {
            showHelpMessage();
            return;
        }

        log('🗑️  Pinecone Database Clear Script', 'bold');
        log('=====================================\n', 'cyan');

        // Validate environment
        const isValidEnv = await validateEnvironment();
        if (!isValidEnv) {
            process.exit(1);
        }

        // Connect to Pinecone
        const { pinecone, index } = await connectToPinecone();

        // Get current stats
        const stats = await getIndexStats(index);

        const totalVectors = stats.totalRecordCount || 0;

        if (totalVectors === 0) {
            log('\n✅ Index is already empty - nothing to delete', 'green');
            return;
        }

        // Show warning and get confirmation
        if (!isForced && !isConfirmed && !isDryRun) {
            log('\n⚠️  WARNING: DESTRUCTIVE OPERATION', 'red');
            log('=====================================', 'red');
            log(`This will permanently delete ALL ${totalVectors} vectors from:`, 'yellow');
            log(`   Index: ${PINECONE_INDEX_NAME}`, 'yellow');
            log('   This action CANNOT be undone!', 'red');
            log('   All document embeddings will be lost!', 'red');
            log('   You will need to re-index all documents!\n', 'red');

            const answer = await promptUser('Are you absolutely sure? Type "DELETE ALL" to confirm: ');

            if (answer !== 'delete all') {
                log('\n❌ Operation cancelled', 'yellow');
                log('   To proceed, type exactly: DELETE ALL', 'blue');
                return;
            }
        }

        // Perform deletion
        const result = await deleteAllVectors(index, stats, isDryRun);

        if (result.success && !result.dryRun) {
            // Verify deletion
            await verifyDeletion(index);

            log('\n🎉 Pinecone database cleared successfully!', 'green');
            log('=====================================', 'green');
            log(`✅ ${result.deletedCount} vectors deleted`, 'green');
            log(`⏱️  Completed in ${result.duration}ms`, 'green');
            log('\n📝 Next Steps:', 'bold');
            log('   1. Your Pinecone index is now empty', 'blue');
            log('   2. Use the "Index Documents" feature in your app to re-index', 'blue');
            log('   3. Or use the bulk embeddings API to re-index programmatically', 'blue');

        } else if (result.dryRun) {
            log('\n✅ Dry run completed - no changes made', 'green');
        }

    } catch (error) {
        log(`\n❌ Script failed: ${error.message}`, 'red');
        console.error(error.stack);
        process.exit(1);
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    log('\n\n❌ Operation cancelled by user', 'yellow');
    process.exit(0);
});

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main };
