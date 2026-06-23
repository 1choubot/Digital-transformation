import express from 'express';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { projectsRouter } from './routes/projects.js';
import { usersRouter } from './routes/users.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/projects', projectsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
