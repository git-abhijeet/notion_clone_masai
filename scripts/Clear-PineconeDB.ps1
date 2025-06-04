# PowerShell script to clear Pinecone database
# Usage: .\scripts\Clear-PineconeDB.ps1 [-Force] [-DryRun] [-Help]

param(
    [switch]$Force,
    [switch]$DryRun,
    [switch]$Help
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
    Magenta = "Magenta"
    White = "White"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Show-Help {
    Write-ColorOutput "`n🗑️  Pinecone Database Clear Script (PowerShell)" "Blue"
    Write-ColorOutput "=============================================" "Cyan"
    Write-ColorOutput "`nThis script will delete ALL vectors from your Pinecone index." "Yellow"
    Write-ColorOutput "⚠️  WARNING: This operation cannot be undone!`n" "Red"
    
    Write-ColorOutput "Usage:" "Blue"
    Write-ColorOutput "  .\scripts\Clear-PineconeDB.ps1              # Interactive mode"
    Write-ColorOutput "  .\scripts\Clear-PineconeDB.ps1 -Force       # Force without prompts"
    Write-ColorOutput "  .\scripts\Clear-PineconeDB.ps1 -DryRun      # Preview only"
    Write-ColorOutput "  .\scripts\Clear-PineconeDB.ps1 -Help        # Show this help`n"
    
    Write-ColorOutput "Parameters:" "Blue"
    Write-ColorOutput "  -Force    Force deletion without any prompts"
    Write-ColorOutput "  -DryRun   Show what would be deleted without deleting"
    Write-ColorOutput "  -Help     Show this help message`n"
    
    Write-ColorOutput "Requirements:" "Blue"
    Write-ColorOutput "  - Node.js must be installed"
    Write-ColorOutput "  - .env.local file with PINECONE_API_KEY"
    Write-ColorOutput "  - Project dependencies installed (npm install)`n"
}

function Test-Prerequisites {
    Write-ColorOutput "🔍 Checking prerequisites..." "Cyan"
    
    # Check if Node.js is installed
    try {
        $nodeVersion = node --version 2>$null
        Write-ColorOutput "✅ Node.js found: $nodeVersion" "Green"
    }
    catch {
        Write-ColorOutput "❌ Node.js not found. Please install Node.js first." "Red"
        return $false
    }
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        Write-ColorOutput "❌ package.json not found. Please run from project root." "Red"
        return $false
    }
    
    # Check if the clear script exists
    if (-not (Test-Path "scripts\clear-pinecone-db.js")) {
        Write-ColorOutput "❌ clear-pinecone-db.js script not found." "Red"
        return $false
    }
    
    # Check if .env.local exists
    if (-not (Test-Path ".env.local")) {
        Write-ColorOutput "❌ .env.local file not found." "Red"
        Write-ColorOutput "   Please create .env.local with your PINECONE_API_KEY" "Yellow"
        return $false
    }
    
    Write-ColorOutput "✅ All prerequisites met" "Green"
    return $true
}

function Invoke-ClearScript {
    param(
        [switch]$Force,
        [switch]$DryRun
    )
    
    Write-ColorOutput "`n🚀 Running Pinecone clear script..." "Cyan"
    
    $scriptArgs = @()
    
    if ($Force) {
        $scriptArgs += "--force"
    }
    
    if ($DryRun) {
        $scriptArgs += "--dry-run"
    }
    
    $command = "node"
    $arguments = @("scripts\clear-pinecone-db.js") + $scriptArgs
    
    try {
        Write-ColorOutput "Executing: $command $($arguments -join ' ')" "Blue"
        & $command $arguments
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "`n✅ Script completed successfully!" "Green"
        }
        else {
            Write-ColorOutput "`n❌ Script failed with exit code: $LASTEXITCODE" "Red"
        }
    }
    catch {
        Write-ColorOutput "`n❌ Failed to execute script: $($_.Exception.Message)" "Red"
    }
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

Write-ColorOutput "🗑️  Pinecone Database Clear Script (PowerShell)" "Blue"
Write-ColorOutput "=============================================" "Cyan"

# Check prerequisites
if (-not (Test-Prerequisites)) {
    Write-ColorOutput "`n❌ Prerequisites not met. Exiting." "Red"
    exit 1
}

# Show warning for non-dry-run operations
if (-not $DryRun) {
    Write-ColorOutput "`n⚠️  WARNING: DESTRUCTIVE OPERATION" "Red"
    Write-ColorOutput "This will permanently delete ALL vectors from your Pinecone database!" "Yellow"
    Write-ColorOutput "This action CANNOT be undone!" "Red"
    
    if (-not $Force) {
        $confirmation = Read-Host "`nAre you absolutely sure? Type 'YES' to continue"
        if ($confirmation -ne "YES") {
            Write-ColorOutput "`n❌ Operation cancelled" "Yellow"
            exit 0
        }
    }
}

# Execute the script
Invoke-ClearScript -Force:$Force -DryRun:$DryRun

Write-ColorOutput "`nScript execution completed." "Blue"
