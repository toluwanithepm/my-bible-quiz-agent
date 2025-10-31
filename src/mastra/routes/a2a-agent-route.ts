import { registerApiRoute } from '@mastra/core/server';
import { randomUUID } from 'crypto';
interface A2APart {
  kind: 'text' | 'data';
  text?: string;
  data?: any;
}

interface A2AMessage {
  role: string;
  parts?: A2APart[];
  messageId?: string;
  taskId?: string;
}

interface BibleQuestion {
  id: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface BibleQuizToolOutput {
  questions: BibleQuestion[];
  generatedAt: string;
  mode: string;
  totalQuestions: number;
}

export const a2aAgentRoute = registerApiRoute('/a2a/agent/:agentId', {
  method: 'POST',
  handler: async (c) => {
    try {
      const mastra = c.get('mastra');
      const agentId = c.req.param('agentId');

      // Parse JSON-RPC 2.0 request
      const body = await c.req.json();
      const { jsonrpc, id: requestId, method, params } = body;

      // Validate JSON-RPC 2.0 format
      if (jsonrpc !== '2.0' || !requestId) {
        return c.json({
          jsonrpc: '2.0',
          id: requestId || null,
          error: {
            code: -32600,
            message: 'Invalid Request: jsonrpc must be "2.0" and id is required'
          }
        }, 400);
      }

      const agent = mastra.getAgent(agentId);
      if (!agent) {
        return c.json({
          jsonrpc: '2.0',
          id: requestId,
          error: {
            code: -32602,
            message: `Agent '${agentId}' not found`
          }
        }, 404);
      }

      // Extract messages from params
      const { message, messages, contextId, taskId, metadata } = params || {};

      let messagesList: A2AMessage[] = [];
      if (message) {
        messagesList = [message as A2AMessage];
      } else if (messages && Array.isArray(messages)) {
        messagesList = messages as A2AMessage[];
      }

      // Convert A2A messages to Mastra format (assuming agent.generate expects string[])
      const mastraMessages: string[] = messagesList.map((msg) =>
        msg.parts?.map((part) => {
          if (part.kind === 'text') return part.text;
          if (part.kind === 'data') return JSON.stringify(part.data);
          return '';
        }).join('\n') || ''
      );

      // Execute agent
      const response = await agent.generate(mastraMessages);
      const agentText = response.text || '';

      // Build artifacts array
      const artifacts: { artifactId: string; name: string; parts: A2APart[]; }[] = [
        {
          artifactId: randomUUID(),
          name: `${agentId}Response`,
          parts: [{ kind: 'text', text: agentText }]
        }
      ];

      // Add tool results as artifacts with better formatting
      if (response.toolResults && response.toolResults.length > 0) {
        // Add structured tool results
        artifacts.push({
          artifactId: randomUUID(),
          name: 'ToolResults',
          parts: response.toolResults.map((result) => ({
            kind: 'data',
            data: result
          }))
        });

        // Also add formatted text version if it's quiz data
        response.toolResults.forEach((toolResultChunk) => {
          // Safely check if the tool result chunk contains BibleQuizToolOutput in its payload.output
          if (toolResultChunk.type === 'tool-result' && toolResultChunk.payload && 'output' in toolResultChunk.payload) {
            const toolOutput = toolResultChunk.payload.output;
            // Refined type narrowing for toolOutput
            if (
              typeof toolOutput === 'object' &&
              toolOutput !== null &&
              'questions' in toolOutput &&
              Array.isArray((toolOutput as any).questions) && // Check if 'questions' exists and is an array
              'generatedAt' in toolOutput && typeof (toolOutput as any).generatedAt === 'string' &&
              'mode' in toolOutput && typeof (toolOutput as any).mode === 'string' &&
              'totalQuestions' in toolOutput && typeof (toolOutput as any).totalQuestions === 'number'
            ) {
              const quizResult = toolOutput as BibleQuizToolOutput;
              const formattedQuestions = quizResult.questions.map((q, idx) => {
                return `Question ${idx + 1}: ${q.question}\nA) ${q.options.A}\nB) ${q.options.B}\nC) ${q.options.C}\nD) ${q.options.D}\n[Difficulty: ${q.difficulty} | Category: ${q.category}]\n`;
              }).join('\n');

              artifacts.push({
                artifactId: randomUUID(),
                name: 'FormattedQuiz',
                parts: [{
                  kind: 'text',
                  text: `📚 Bible Quiz Questions\nGenerated: ${quizResult.generatedAt}\nMode: ${quizResult.mode}\nTotal: ${quizResult.totalQuestions}\n\n${formattedQuestions}`
                }]
              });
            }
          }
        });
      }

      // Build conversation history
      const history = [
        ...messagesList.map((msg) => ({
          kind: 'message',
          role: msg.role,
          parts: msg.parts,
          messageId: msg.messageId || randomUUID(),
          taskId: msg.taskId || taskId || randomUUID(),
        })),
        {
          kind: 'message',
          role: 'agent',
          parts: [{ kind: 'text', text: agentText }],
          messageId: randomUUID(),
          taskId: taskId || randomUUID(),
        }
      ];

      // Return A2A-compliant response
      return c.json({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          id: taskId || randomUUID(),
          contextId: contextId || randomUUID(),
          status: {
            state: 'completed',
            timestamp: new Date().toISOString(),
            message: {
              messageId: randomUUID(),
              role: 'agent',
              parts: [{ kind: 'text', text: agentText }],
              kind: 'message'
            }
          },
          artifacts,
          history,
          kind: 'task'
        }
      });

    } catch (error) {
      return c.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { details: error.message }
        }
      }, 500);
    }
  }
});