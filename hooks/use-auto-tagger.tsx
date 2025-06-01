import { useState } from "react";

export const useAutoTagger = () => {
  const [isLoading, setIsLoading] = useState(false);

  const generateTags = async (content: string, title: string): Promise<string[]> => {
    if (!content || content.length < 50) {
      return [];
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/auto-tagger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `${title}\n\n${content}` })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate tags');
      }
      
      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Auto-tagger error:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return { generateTags, isLoading };
};
