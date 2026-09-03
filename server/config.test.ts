import {describe, expect, it} from 'vitest';

import {resolveAppConfig, resolveFrontendDir} from './config.js';

describe('resolveAppConfig', () => {
  it('keeps runtime data outside the repository and allows an explicit test directory', () => {
    const config = resolveAppConfig(
      {LOCALAPPDATA: 'C:\\Users\\tester\\AppData\\Local'},
      'E:\\repo\\pc-music-player',
    );

    expect(config.dataDir).toBe(
      'C:\\Users\\tester\\AppData\\Local\\255-phonograph',
    );
    expect(config.dataDir.startsWith('E:\\repo\\pc-music-player')).toBe(false);

    const overridden = resolveAppConfig(
      {PHONOGRAPH_DATA_DIR: 'E:\\tmp\\phonograph-test'},
      'E:\\repo\\pc-music-player',
    );

    expect(overridden.databasePath).toBe(
      'E:\\tmp\\phonograph-test\\library.sqlite',
    );
  });
});

describe('resolveFrontendDir', () => {
  it('serves the built frontend for npm start but not the development watcher', () => {
    const cwd = 'E:\\repo\\pc-music-player';

    expect(resolveFrontendDir({npm_lifecycle_event: 'start'}, cwd)).toBe(
      'E:\\repo\\pc-music-player\\dist',
    );
    expect(
      resolveFrontendDir({npm_lifecycle_event: 'dev:server'}, cwd),
    ).toBeUndefined();
  });
});
