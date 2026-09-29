import {afterEach, describe, expect, it} from 'vitest';
import {tmpdir} from 'node:os';
import path from 'node:path';

import type {FastifyInstance} from 'fastify';

import {buildApp} from './app.js';
import type {AppConfig} from './config.js';

const testConfig: AppConfig = {
  host: '127.0.0.1',
  port: 3001,
  dataDir: path.resolve(tmpdir(), 'phonograph-app-test'),
  databasePath: path.resolve(tmpdir(), 'phonograph-app-test', 'library.sqlite'),
  mediaDir: path.resolve(tmpdir(), 'phonograph-app-test', 'media'),
  sessionCookieName: 'phonograph_admin_session',
};

describe('buildApp', () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it('answers health checks without opening a network port', async () => {
    app = await buildApp({config: testConfig});

    const response = await app.inject({method: 'GET', url: '/api/health'});

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ok: true});
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('falls back to the frontend only outside the API path segment', async () => {
    app = await buildApp({config: testConfig, frontendDir: process.cwd()});

    const pageResponse = await app.inject({method: 'GET', url: '/apiary'});
    const apiResponse = await app.inject({method: 'GET', url: '/api/missing'});

    expect(pageResponse.statusCode).toBe(200);
    expect(pageResponse.headers['content-type']).toContain('text/html');
    expect(pageResponse.body).toContain('<!doctype html>');
    expect(apiResponse.statusCode).toBe(404);
    expect(apiResponse.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      },
    });
  });
});
