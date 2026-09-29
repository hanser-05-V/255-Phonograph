import {describe, expect, it} from 'vitest';
import path from 'node:path';

import {resolveAppConfig, resolveFrontendDir} from './config.js';

describe('resolveAppConfig', () => {
  it('keeps runtime data outside the repository and allows an explicit test directory', () => {
    const config = resolveAppConfig(
      {LOCALAPPDATA: path.resolve('test-local-app-data')},
      path.resolve('test-repository'),
    );

    expect(config.dataDir).toBe(
      path.resolve('test-local-app-data', '255-phonograph'),
    );
    expect(config.dataDir.startsWith(path.resolve('test-repository'))).toBe(false);

    const overridden = resolveAppConfig(
      {PHONOGRAPH_DATA_DIR: path.resolve('test-data')},
      path.resolve('test-repository'),
    );

    expect(overridden.databasePath).toBe(
      path.resolve('test-data', 'library.sqlite'),
    );
  });
});

describe('resolveFrontendDir', () => {
  it('serves the built frontend for npm start but not the development watcher', () => {
    const cwd = path.resolve('test-repository');

    expect(resolveFrontendDir({npm_lifecycle_event: 'start'}, cwd)).toBe(
      path.join(cwd, 'dist'),
    );
    expect(
      resolveFrontendDir({npm_lifecycle_event: 'dev:server'}, cwd),
    ).toBeUndefined();
  });
});

describe('private cloud configuration', () => {
  const environment = {
    PHONOGRAPH_DEPLOYMENT: 'private-cloud',
    PHONOGRAPH_DATA_DIR: path.resolve('isolated-data'),
    PHONOGRAPH_SITE_ORIGIN: 'https://phonograph.invalid',
    PHONOGRAPH_RELEASE_ID: 'a'.repeat(40),
  };

  it('enables cloud protection only with explicit valid inputs', () => {
    expect(resolveAppConfig(environment, process.cwd()).cloud).toEqual({
      siteOrigin: 'https://phonograph.invalid', releaseId: 'a'.repeat(40),
    });
    expect(resolveAppConfig({}, process.cwd()).cloud).toBeUndefined();
  });

  it.each([
    ['PHONOGRAPH_DATA_DIR', ''], ['PHONOGRAPH_DATA_DIR', 'relative'],
    ['PHONOGRAPH_SITE_ORIGIN', 'http://phonograph.invalid'],
    ['PHONOGRAPH_SITE_ORIGIN', 'https://user:pass@phonograph.invalid'],
    ['PHONOGRAPH_SITE_ORIGIN', 'https://phonograph.invalid/music'],
    ['PHONOGRAPH_SITE_ORIGIN', 'https://phonograph.invalid/?x=1'],
    ['PHONOGRAPH_SITE_ORIGIN', 'https://phonograph.invalid/#x'],
    ['PHONOGRAPH_SITE_ORIGIN', 'https://phonograph.invalid:444'],
    ['PHONOGRAPH_SITE_ORIGIN', 'https://phonograph.invalid/hidden/..'],
    ['PHONOGRAPH_RELEASE_ID', 'main'], ['PHONOGRAPH_HOST', '0.0.0.0'],
    ['PHONOGRAPH_DEPLOYMENT', 'unknown'],
  ])('rejects unsafe %s = %s', (key, value) => {
    expect(() => resolveAppConfig({...environment, [key]: value}, process.cwd())).toThrow();
  });
});
