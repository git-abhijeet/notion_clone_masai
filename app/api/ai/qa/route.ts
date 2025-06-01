import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { question, documents } = await req.json();
    
    if (!question || !documents) {
      return NextResponse.json({ 
        response: "Please provide a question and documents to search.", 
        sources: [],
        confidence: 0
      });
    }

    // Better document relevance filtering using content similarity
    const relevantDocs = documents
      .filter((doc: any) => doc.content && doc.content.length > 50)
      .map((doc: any) => {
        const questionLower = question.toLowerCase();
        const titleMatch = doc.title.toLowerCase().includes(questionLower.split(' ').some((word: string) => word.length > 3 && doc.title.toLowerCase().includes(word)));
        const contentMatch = questionLower.split(' ')
          .filter((word: string) => word.length > 3)
          .some((word: string) => doc.content?.toLowerCase().includes(word));
        
        return {
          ...doc,
          relevanceScore: (titleMatch ? 2 : 0) + (contentMatch ? 1 : 0)
        };
      })
      .filter((doc: any) => doc.relevanceScore > 0)
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8); // Limit to 8 most relevant docs

    if (relevantDocs.length === 0) {
      return NextResponse.json({
        response: "I couldn't find any relevant documents in your workspace that address this question. Please make sure you have documents with content related to your query.",
        sources: [],
        confidence: 0
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `You are an expert knowledge assistant for a personal workspace. Your role is to provide comprehensive, accurate answers based ONLY on the provided documents.

Guidelines:
1. ONLY use information from the provided documents - never add external knowledge
2. Provide specific, detailed answers with relevant information from the documents
3. Always cite which documents you're referencing by title
4. If the documents don't contain enough information, clearly state what's missing
5. Structure your response clearly with main points and supporting details
6. When multiple documents discuss the same topic, synthesize the information
7. Include relevant quotes or specific details when they add value
8. If conflicting information exists across documents, mention both perspectives
9. Rate your confidence level (0-100%) based on how well the documents address the question

Format your response as:
**Answer:** [Your detailed answer]

**Sources Referenced:** [List the document titles you used]

**Confidence:** [0-100%] - [Brief explanation of confidence level]`
      }, {
        role: "user",
        content: `Question: ${question}

Relevant Workspace Documents:
${relevantDocs.map((doc: any, index: number) => 
  `${index + 1}. Document: "${doc.title}"
   Content: ${doc.content?.substring(0, 800)}${doc.content?.length > 800 ? '...' : ''}
   
`).join('')}

Please provide a comprehensive answer based on these documents.`
      }],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content || "I couldn't generate a response.";
    
    // Extract confidence score from response if present
    const confidenceMatch = response.match(/\*\*Confidence:\*\*\s*(\d+)%/);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 50;

    // Identify sources mentioned in the response
    const mentionedSources = relevantDocs.filter((doc: any) => 
      response.toLowerCase().includes(doc.title.toLowerCase())
    );

    return NextResponse.json({
      response,
      sources: mentionedSources.length > 0 
        ? mentionedSources.map((doc: any) => ({ id: doc._id, title: doc.title }))
        : relevantDocs.slice(0, 3).map((doc: any) => ({ id: doc._id, title: doc.title })),
      confidence
    });
  } catch (error) {
    console.error('Q&A error:', error);
    return NextResponse.json({ 
      response: "Sorry, I encountered an error while processing your question. Please try again.", 
      sources: [],
      confidence: 0
    }, { status: 500 });
  }
}
