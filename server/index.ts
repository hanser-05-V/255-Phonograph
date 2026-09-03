import {mkdir} from 'node:fs/promises';

import {buildApp} from './app.js';
import {resolveAppConfig, resolveFrontendDir} from './config.js';

async function start(): Promise<void> {
  const config = resolveAppConfig(process.env, process.cwd());
  await mkdir(config.dataDir, {recursive: true});
  await mkdir(config.mediaDir, {recursive: true});

  const app = await buildApp({
    config,
    frontendDir: resolveFrontendDir(process.env, process.cwd()),
  });

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await app.close();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await app.listen({host: config.host, port: config.port});
}

start().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
