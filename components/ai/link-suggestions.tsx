"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, X, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LinkSuggestion {
  documentId: string;
  title: string;
  relevance: number;
  suggestedText: string;
  reason: string;
}

interface LinkSuggestionsProps {
  suggestions: LinkSuggestion[];
  isLoading?: boolean;
  onDismiss: () => void;
}

export function LinkSuggestions({ suggestions, isLoading = false, onDismiss }: LinkSuggestionsProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || (!isLoading && suggestions.length === 0)) return null;

  const handleClose = () => {
    setIsVisible(false);
    onDismiss();
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 shadow-lg border-blue-200 bg-white dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              AI Link Suggestions
            </span>
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Finding relevant links...
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
                    {suggestion.title}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(suggestion.relevance * 100)}%
                  </Badge>
                </div>
                
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {suggestion.reason}
                </p>
                
                <div className="flex items-center justify-between">                  <span className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                    &ldquo;{suggestion.suggestedText}&rdquo;
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => router.push(`/documents/${suggestion.documentId}`)}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open
                  </Button>
                </div>
              </div>
            ))}
            
            {suggestions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                No relevant links found for this content.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
