# AI Text Completion Feature

This feature provides intelligent text completion suggestions while typing, similar to email auto-suggestions. It integrates seamlessly with the BlockNote editor.

## Features

-   **Smart Completions**: AI-powered suggestions based on context
-   **Non-intrusive**: Appears in muted colors and doesn't disrupt typing
-   **Keyboard Controls**:
    -   Press `Tab` to accept suggestions
    -   Press `Escape` to dismiss suggestions
-   **Intelligent Triggers**: Only suggests when there's sufficient context (10+ characters)
-   **Debounced Requests**: Optimized to prevent excessive API calls

## Setup

### 1. Environment Variables

Make sure you have the following environment variable set in your `.env.local`:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 2. Enable in Editor

To enable text completion in your editor component:

```tsx
import Editor from "@/components/editor";

function MyComponent() {
    return (
        <Editor
            onChange={handleChange}
            editable={true}
            aiTextCompletion={true} // Enable text completion
        />
    );
}
```

## Demo

Visit `/text-completion-demo` to see the feature in action.

## How It Works

1. **Text Analysis**: When you type, the system analyzes the current text and cursor position
2. **AI Request**: If there's sufficient context, it sends a request to Google Gemini
3. **Smart Filtering**: The AI generates contextually relevant completions (1-5 words)
4. **Display**: Suggestions appear in gray text at the cursor position
5. **Acceptance**: Press Tab to accept, or continue typing to dismiss

## API Endpoint

The text completion is powered by `/api/ai/text-completion` which:

-   Uses Google Gemini AI for intelligent suggestions
-   Implements smart filtering and context analysis
-   Returns short, relevant completions
-   Handles edge cases and error scenarios

## Components

-   `useTextCompletion` - Hook for managing completion state
-   `BlockNoteTextCompletion` - Integration component for BlockNote editor
-   `TextCompletion` - Generic text completion component

## Best Practices

-   The feature automatically manages when to show/hide suggestions
-   Suggestions only appear when typing at the end of text
-   The system is designed to be helpful but not intrusive
-   All requests are debounced to optimize performance

## Examples

Try typing these phrases to see completions:

-   "The capital of France is"
-   "Machine learning is a subset of"
-   "JavaScript is a programming language used for"
-   "The weather today is"
