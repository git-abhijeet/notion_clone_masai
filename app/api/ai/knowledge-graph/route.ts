import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Document {
  _id: string;
  title: string;
  content?: string;
  tags?: string[];
  aiGeneratedTags?: string[];
}

interface Node {
  id: string;
  title: string;
  group: number;
  size: number;
  type: string;
}

interface Link {
  source: string;
  target: string;
  strength: number;
  type: string;
}

export async function POST(req: NextRequest) {
  try {
    const { documents }: { documents: Document[] } = await req.json();
    
    if (!documents || documents.length === 0) {
      return NextResponse.json({ nodes: [], links: [] });
    }

    // Limit documents to avoid token limits and ensure we have content
    const limitedDocs = documents
      .filter(doc => doc.content && doc.content.length > 50)
      .slice(0, 15);

    if (limitedDocs.length === 0) {
      return NextResponse.json({ nodes: [], links: [] });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `You are an expert knowledge graph analyst. Your task is to analyze documents and create a meaningful knowledge graph that shows relationships between concepts, topics, and documents.

Create a comprehensive knowledge graph with:
1. Document nodes representing the actual documents
2. Concept nodes representing key topics/themes found across documents
3. Meaningful relationships between documents and concepts

Return ONLY valid JSON in this exact format:
{
  "nodes": [
    {"id": "doc_id", "title": "Document Title", "group": 1, "size": 15, "type": "document"},
    {"id": "concept_1", "title": "Concept Name", "group": 2, "size": 10, "type": "concept"}
  ],
  "links": [
    {"source": "doc_id", "target": "concept_1", "strength": 0.8, "type": "contains"},
    {"source": "doc_1", "target": "doc_2", "strength": 0.6, "type": "related"}
  ]
}

Rules:
- Use actual document IDs provided
- Group similar documents/concepts (groups 1-5)
- Size: documents 10-25 (based on content length), concepts 5-15 (based on frequency)
- Strength: 0.3-1.0 (higher for stronger relationships)
- Link types: "contains" (doc->concept), "related" (doc->doc), "shares" (doc->concept)
- Only create links for genuine, meaningful relationships
- Limit to most important concepts to keep graph readable`
      }, {
        role: "user",
        content: `Analyze these documents and create a knowledge graph:

${limitedDocs.map((doc, index) => 
  `${index + 1}. Document ID: ${doc._id}
   Title: "${doc.title}"
   Content: ${doc.content?.substring(0, 400)}${doc.content && doc.content.length > 400 ? '...' : ''}
   Tags: ${doc.tags?.join(', ') || 'None'}
   AI Tags: ${doc.aiGeneratedTags?.join(', ') || 'None'}
   
`).join('')}

Focus on identifying:
1. Shared concepts and themes across documents
2. Related documents that discuss similar topics
3. Key concepts that appear in multiple documents
4. Hierarchical relationships between topics`
      }],
      temperature: 0.2,
      max_tokens: 1500,
    });

    let graphData: { nodes: Node[], links: Link[] } = { nodes: [], links: [] };
      try {
      const responseContent = completion.choices[0]?.message?.content;
      if (responseContent) {
        // Handle both raw JSON and markdown-wrapped JSON
        let cleanedContent = responseContent.trim();
        
        // Remove markdown code block wrapper if present
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        graphData = JSON.parse(cleanedContent);
        
        // Validate and clean the graph data
        if (graphData.nodes && Array.isArray(graphData.nodes)) {
          graphData.nodes = graphData.nodes.filter((node: Node) => 
            node.id && node.title && typeof node.group === 'number' && typeof node.size === 'number'
          );
        }

        if (graphData.links && Array.isArray(graphData.links)) {
          const nodeIds = new Set(graphData.nodes.map((n: Node) => n.id));
          graphData.links = graphData.links.filter((link: Link) => 
            nodeIds.has(link.source) && 
            nodeIds.has(link.target) && 
            typeof link.strength === 'number' &&
            link.strength >= 0.3 && 
            link.strength <= 1.0
          );
        }
      }    } catch (parseError) {
      console.error('Failed to parse knowledge graph response:', parseError);
      console.error('Raw response:', completion.choices[0]?.message?.content);
      // Fallback: create simple graph from documents
      graphData = {
        nodes: limitedDocs.map((doc, index) => ({
          id: doc._id,
          title: doc.title,
          group: Math.floor(index / 3) + 1,
          size: Math.min(Math.max(doc.content?.length || 0 / 50, 10), 25),
          type: 'document'
        })),
        links: []
      };
    }

    return NextResponse.json(graphData);
  } catch (error) {
    console.error('Knowledge graph error:', error);
    return NextResponse.json({ nodes: [], links: [] }, { status: 500 });
  }
}
