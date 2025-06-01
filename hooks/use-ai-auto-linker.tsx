import { useEffect, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";

interface LinkSuggestion {
  documentId: string;
  title: string;
  relevance: number;
  suggestedText: string;
  reason: string;
}

export const useAIAutoLinker = (content: string) => {
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedContent] = useDebounceValue(content, 1500);
  const { isSignedIn } = useUser();
  
  // Only query documents if user is authenticated
  const allDocuments = useQuery(
    api.documents.getAllWithContent,
    isSignedIn ? {} : "skip"
  );

  useEffect(() => {
    if (isSignedIn && debouncedContent && allDocuments && debouncedContent.length > 50) {
      generateLinkSuggestions(debouncedContent, allDocuments);
    } else {
      setSuggestions([]);
    }
  }, [debouncedContent, allDocuments, isSignedIn]);

  const generateLinkSuggestions = async (text: string, docs: any[]) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/auto-linker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, documents: docs })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        console.error('Auto-linker API error:', response.status);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Auto-linker error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return { suggestions, isLoading };
};
