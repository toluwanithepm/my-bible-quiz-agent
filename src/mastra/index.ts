// src/mastra/index.ts
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { bibleQuizAgent } from './agents/bible-quiz-agent';
import { a2aAgentRoute } from './routes/a2a-agent-route.ts';

export const mastra = new Mastra({
  agents: { bibleQuizAgent },
  storage: new LibSQLStore({ url: 'file:./mastra.db' }),
  logger: new PinoLogger({
    name: 'BibleQuizMastra',
    level: 'debug',
  }),
  observability: {
    default: { enabled: true },
  },
  server: {
    build: {
      openAPIDocs: true,
      swaggerUI: true,
    },
    apiRoutes: [a2aAgentRoute]
  }
});