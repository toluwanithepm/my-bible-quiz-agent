// src/mastra/routes/a2a-agent-route.ts
import { registerApiRoute } from '@mastra/core/server';
import { randomUUID } from 'crypto';

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

interface A2AMessagePart {
  kind: 'text' | 'data';
  text?: string;
  data?: any;
}

interface A2AMessage {
  role: string;
  parts: A2AMessagePart[];
  messageId?: string;
  taskId?: string;
}

      let messagesList: A2AMessage[] = [];
      if (message) {
        messagesList = [message];
      } else if (messages && Array.isArray(messages)) {
        messagesList = messages;
      }

      // Convert A2A messages to Mastra format
      const mastraMessages: string[] = messagesList.map((msg) => {
        const content = msg.parts?.map((part) => {
          if (part.kind === 'text') return part.text;
          if (part.kind === 'data') return JSON.stringify(part.data);
          return '';
        }).join('\n') || '';
        return `${msg.role}: ${content}`;
      });

      // Execute agent
      const response = await agent.generate(mastraMessages);
      const agentText = response.text || '';

      // Build artifacts array
      const artifacts: any[] = [
        {
          artifactId: randomUUID(),
          name: `${agentId}Response`,
          parts: [{ kind: 'text', text: agentText }]
        }
      ];

      // Add tool results as artifacts
      if (response.toolResults && response.toolResults.length > 0) {
        artifacts.push({
          artifactId: randomUUID(),
          name: 'ToolResults',
          parts: response.toolResults.map((result) => ({
            kind: 'data',
            data: result
          }))
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