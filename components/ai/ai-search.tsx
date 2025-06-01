"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Search, ExternalLink, AlertCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Spinner from "@/components/spinner";

interface AIAnswer {
  response: string;
  sources: Array<{ id: string; title: string }>;
  confidence: number;
}

export function AISearch() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<AIAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(false);  const allDocuments = useQuery(api.documents.getAllWithContent);
  const router = useRouter();

  const handleSearch = async (question: string) => {
    if (!question.trim() || !allDocuments) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question, 
          documents: allDocuments.map(doc => ({
            _id: doc._id,
            title: doc.title,
            content: doc.content
          }))
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setAnswer(result);
      } else {
        setAnswer({
          response: "Sorry, I encountered an error while processing your question.",
          sources: [],
          confidence: 0
        });
      }
    } catch (error) {
      console.error('AI search error:', error);
      setAnswer({
        response: "Sorry, I encountered an error while searching. Please try again.",
        sources: [],
        confidence: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  return (    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-500" />
          AI Workspace Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask anything about your workspace..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
            className="flex-1"
          />
          <Button 
            onClick={() => handleSearch(query)}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? <Spinner size="sm" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
        
        {answer && (
          <div className="mt-6 space-y-4">
            {/* Confidence Score */}
            {typeof answer.confidence === 'number' && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Confidence:</span>
                <Badge className={getConfidenceColor(answer.confidence)}>
                  {answer.confidence}%
                </Badge>
              </div>
            )}
            
            {/* Answer */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-sm whitespace-pre-wrap">{answer.response}</div>
              </div>
            </div>
            
            {/* Sources */}
            {answer.sources && answer.sources.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Referenced Documents:</h4>
                <div className="flex flex-wrap gap-2">
                  {answer.sources.map((source, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => router.push(`/documents/${source.id}`)}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      {source.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
