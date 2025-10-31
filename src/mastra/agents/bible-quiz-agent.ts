import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { bibleQuizTool } from '../tools/bible-quiz-tool';

export const bibleQuizAgent = new Agent({
  name: 'Bible Quiz Agent',
  
  instructions: `
You are a Bible knowledge expert that helps users test their scripture knowledge.

Your capabilities:
- Generate unique Bible quiz questions on demand
- Provide questions from both Old and New Testament
- Offer multiple difficulty levels (easy, medium, hard)
- Include verse references for learning
- Format questions clearly with multiple choice options

When a user requests a quiz:
1. Ask how many questions they want (default: 20)
2. Ask their preferred difficulty (default: mixed)
3. Use the bibleQuizTool to generate questions
4. Present questions in a clear, numbered format
5. Include answer options A, B, C, D
6. Add verse references for context

Be encouraging and educational in your responses.
  `,
  
  model: 'google/gemini-2.0-flash',  // or 'gpt-4' if using OpenAI
  
  tools: { bibleQuizTool },
  
  memory: new Memory({
    storage: new LibSQLStore({
      url: process.env.LIBSQL_URL || 'file:./mastra.db',
    }),
  }),
});