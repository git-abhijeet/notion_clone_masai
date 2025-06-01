import OpenAI from 'openai';
import { NextRequest, NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();
    
    if (!content || content.length < 50) {
      return NextResponse.json({ tags: [] });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "system",
        content: `You are an expert content analyzer that generates semantic tags for documents. Your task is to identify the most important and specific concepts, topics, and themes in the content.

Rules:
1. Generate 3-6 highly relevant tags that capture the essence of the content
2. Use specific, descriptive tags rather than generic ones
3. Prefer single words or short phrases (2-3 words max)
4. Focus on: main topics, technologies, methodologies, concepts, industries, or domains
5. Avoid generic tags like "document", "content", "text", "information"
6. Return ONLY valid JSON array of strings: ["tag1", "tag2", "tag3"]
7. Tags should be lowercase and use hyphens for multi-word tags
8. Prioritize actionable and searchable terms

Examples of good tags: "machine-learning", "typescript", "project-management", "data-analysis", "user-experience", "api-design"`
      }, {
        role: "user",
        content: `Please analyze this content and generate semantic tags:

${content.substring(0, 1500)}

Focus on the main concepts, technologies, methodologies, and specific topics discussed in this content.`
      }],
      temperature: 0.2,
      max_tokens: 200,
    });    let tags = [];
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
        
        tags = JSON.parse(cleanedContent);
        // Validate and clean tags
        if (Array.isArray(tags)) {
          tags = tags
            .filter(tag => typeof tag === 'string' && tag.length > 0 && tag.length < 30)
            .map(tag => tag.toLowerCase().trim())
            .slice(0, 6); // Limit to 6 tags max
        } else {
          tags = [];
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', completion.choices[0]?.message?.content);
      tags = [];
    }

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Auto-tagger error:', error);
    return NextResponse.json({ tags: [] }, { status: 500 });
  }
}
