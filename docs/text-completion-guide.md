# AI Text Completion Guide

This feature adds smart text auto-completion to the note editor, similar to how Gmail suggests completions as you type.

## How It Works

1. As you type in the editor, the AI will suggest relevant completions
2. Completions appear in a blue overlay box with a 💡 icon
3. Press **Tab** to accept the completion
4. Press **Escape** to dismiss the completion

## Tips for Best Results

-   Type at least 5 characters for suggestions to appear
-   Completions work best with common phrases and questions
-   Capitals of countries work especially well (e.g., "the capital of France is...")
-   The AI tries to match your writing style
-   If no completion appears, keep typing to provide more context

## Example Phrases to Try

### Geography

-   "The capital of Spain is..."
-   "The capital of Brazil is..."
-   "The capital of Japan is..."

### Programming

-   "JavaScript is a programming..."
-   "Python is a..."
-   "React is a..."

### Common Phrases

-   "Thank you for your..."
-   "In conclusion..."
-   "To summarize the main..."

## Technical Details

-   The feature uses a combination of hardcoded patterns and the Google Gemini 2.0 Flash AI model
-   Completions are designed to be short (1-5 words)
-   Local processing happens first for faster responses
-   The feature is designed to work with BlockNote editor
-   Server-side rendering (SSR) is fully supported

## Troubleshooting

If completions aren't working:

1. Check that you have typed at least 5 characters
2. Verify that your sentence structure is clear
3. Try using one of the example phrases above
4. Check the API key configuration if you're a developer

## Configuration

For developers, the feature can be toggled using the `aiTextCompletion` prop on the `Editor` component:

```jsx
<Editor
    onChange={handleChange}
    editable={true}
    aiTextCompletion={true} // Set to false to disable
/>
```

## Debugging

A debugging tool is available on the demo page to test the completion API directly:

1. Go to `/text-completion-demo`
2. Click "Show Debugger"
3. Enter test text and adjust cursor position
4. Click "Test Completion" to see what the API returns
