import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { config, fubConfigured } from './config';
import './db';
import { apiRouter } from './routes';
import { triggerSync } from './fub/sync';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use('/api', apiRouter);

// Serve the built Angular client if it has been compiled.
const clientDir = path.resolve(__dirname, '../../client/dist/client/browser');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));
}

app.listen(config.port, () => {
  console.log(`Pulse API listening on http://localhost:${config.port}`);
  if (fs.existsSync(clientDir)) {
    console.log(`Pulse dashboard served at  http://localhost:${config.port}`);
  }
  if (!fubConfigured()) {
    console.log('  ! FUB_API_KEY is not set — add it to pulse/server/.env to enable syncing.');
  }

  if (config.sync.intervalMinutes > 0 && fubConfigured()) {
    const ms = config.sync.intervalMinutes * 60 * 1000;
    console.log(`  Auto-sync enabled every ${config.sync.intervalMinutes} min.`);
    triggerSync();
    setInterval(() => triggerSync(), ms);
  }
});
