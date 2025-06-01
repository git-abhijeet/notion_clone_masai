"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network } from "lucide-react";
import { Button } from "@/components/ui/button";

export function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const documents = useQuery(api.documents.getSearch);
  const [graphData, setGraphData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateGraphData = async () => {
    if (!documents) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents })
      });
      
      if (response.ok) {
        const data = await response.json();
        setGraphData(data);
      }
    } catch (error) {
      console.error('Knowledge graph error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (graphData && svgRef.current) {
      const svg = svgRef.current;
      svg.innerHTML = '';
      
      if (graphData.nodes && graphData.nodes.length > 0) {
        graphData.nodes.forEach((node: any, index: number) => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          const angle = (index / graphData.nodes.length) * 2 * Math.PI;
          const radius = 80;
          const cx = 150 + radius * Math.cos(angle);
          const cy = 150 + radius * Math.sin(angle);
          
          circle.setAttribute('cx', cx.toString());
          circle.setAttribute('cy', cy.toString());
          circle.setAttribute('r', '8');
          circle.setAttribute('fill', '#3b82f6');
          circle.setAttribute('class', 'cursor-pointer hover:fill-blue-700');
          
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', cx.toString());
          text.setAttribute('y', (cy + 20).toString());
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('class', 'text-xs fill-gray-600 dark:fill-gray-300');
          text.textContent = node.title.substring(0, 10) + '...';
          
          svg.appendChild(circle);
          svg.appendChild(text);
        });
      }
    }
  }, [graphData]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-500" />
          Knowledge Graph
        </CardTitle>
        <Button 
          onClick={generateGraphData} 
          disabled={isLoading || !documents || documents.length === 0}
          size="sm"
        >
          {isLoading ? "Generating..." : "Generate Graph"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="w-full h-96 border rounded-lg bg-gray-50 dark:bg-gray-900">
          <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 300 300">            {!graphData && (
              <text x="150" y="150" textAnchor="middle" className="fill-gray-500 text-sm">
                Click &ldquo;Generate Graph&rdquo; to visualize document relationships
              </text>
            )}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
