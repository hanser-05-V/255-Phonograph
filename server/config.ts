import {homedir} from 'node:os';
import path from 'node:path';

export type AppConfig = {
  host: string;
  port: number;
  dataDir: string;
  databasePath: string;
  mediaDir: string;
  sessionCookieName: string;
};

type AppEnvironment = Partial<
  Record<
    | 'LOCALAPPDATA'
    | 'NODE_ENV'
    | 'PHONOGRAPH_DATA_DIR'
    | 'PHONOGRAPH_HOST'
    | 'PHONOGRAPH_PORT'
    | 'npm_lifecycle_event',
    string
  >
>;

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3001;
const SESSION_COOKIE_NAME = 'phonograph_admin_session';

function resolveDataDir(env: AppEnvironment, cwd: string): string {
  const configuredDataDir = env.PHONOGRAPH_DATA_DIR?.trim();
  if (configuredDataDir) {
    return path.resolve(cwd, configuredDataDir);
  }

  const localAppData = env.LOCALAPPDATA?.trim();
  if (localAppData) {
    return path.join(localAppData, '255-phonograph');
  }

  return path.join(homedir(), '.255-phonograph');
}

function resolvePort(value: string | undefined): number {
  if (!value?.trim()) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PHONOGRAPH_PORT must be an integer between 1 and 65535');
  }

  return port;
}

export function resolveAppConfig(env: AppEnvironment, cwd: string): AppConfig {
  const dataDir = resolveDataDir(env, cwd);

  return {
    host: env.PHONOGRAPH_HOST?.trim() || DEFAULT_HOST,
    port: resolvePort(env.PHONOGRAPH_PORT),
    dataDir,
    databasePath: path.join(dataDir, 'library.sqlite'),
    mediaDir: path.join(dataDir, 'media'),
    sessionCookieName: SESSION_COOKIE_NAME,
  };
}

export function resolveFrontendDir(
  env: AppEnvironment,
  cwd: string,
): string | undefined {
  const servesBuiltFrontend =
    env.NODE_ENV === 'production' || env.npm_lifecycle_event === 'start';

  return servesBuiltFrontend ? path.resolve(cwd, 'dist') : undefined;
}
