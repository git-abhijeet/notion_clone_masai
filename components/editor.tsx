"use client";
import { useState } from "react";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useTheme } from "next-themes";
import { useEdgeStore } from "@/lib/edgestore";
import { useAIAutoLinker } from "@/hooks/use-ai-auto-linker";
import { LinkSuggestions } from "@/components/ai/link-suggestions";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface EditorProps {
  onChange: (content: string) => void;
  initialContent?: string;
  editable?: boolean;
}
function Editor({ onChange, initialContent, editable }: EditorProps) {
  const { resolvedTheme } = useTheme();
  const { edgestore } = useEdgeStore();
  const [content, setContent] = useState(initialContent || "");
  const { suggestions, isLoading } = useAIAutoLinker(content);

  const handleUpload = async (file: File) => {
    const res = await edgestore.publicFiles.upload({ file });
    return res.url;
  };

  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    uploadFile: handleUpload,
  });

  const handelChange = () => {
    const blocks = editor.topLevelBlocks;
    const jsonContent = JSON.stringify(blocks, null, 2);
    onChange(jsonContent);
    
    // Extract text content for AI auto-linker
    const textContent = blocks.map((block: any) => {
      if (block.content && Array.isArray(block.content)) {
        return block.content.map((item: any) => 
          typeof item === 'string' ? item : item.text || ''
        ).join(' ');
      } else if (block.content && typeof block.content === 'string') {
        return block.content;
      }
      return '';
    }).join(' ').trim();
    
    setContent(textContent);
  };

  return (
    <div className="relative">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        editable={editable}
        onChange={handelChange}
      />
      {editable && (suggestions.length > 0 || isLoading) && (
        <LinkSuggestions 
          suggestions={suggestions}
          isLoading={isLoading}
          onDismiss={() => {
            // Suggestions will reappear if content changes
          }}
        />
      )}
    </div>
  );
}

export default Editor;
