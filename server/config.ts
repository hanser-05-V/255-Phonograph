import {homedir} from 'node:os';
import path from 'node:path';

export type CloudConfig = {siteOrigin: string; releaseId: string};

export type AppConfig = {
  cloud?: CloudConfig;
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
    | 'PHONOGRAPH_DEPLOYMENT'
    | 'PHONOGRAPH_SITE_ORIGIN'
    | 'PHONOGRAPH_RELEASE_ID'
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
  const mode = env.PHONOGRAPH_DEPLOYMENT?.trim() || 'local';
  if (mode !== 'local' && mode !== 'private-cloud') {
    throw new Error('Invalid PHONOGRAPH_DEPLOYMENT');
  }
  let cloud: CloudConfig | undefined;
  if (mode === 'private-cloud') {
    if (!env.PHONOGRAPH_DATA_DIR?.trim() || !path.isAbsolute(env.PHONOGRAPH_DATA_DIR.trim())) {
      throw new Error('PHONOGRAPH_DATA_DIR must be an explicit absolute path');
    }
    let origin: URL;
    try { origin = new URL(env.PHONOGRAPH_SITE_ORIGIN ?? ''); }
    catch { throw new Error('PHONOGRAPH_SITE_ORIGIN must be a HTTPS origin'); }
    if (!/^https:\/\/[^/?#\\@\s]+\/?$/i.test(env.PHONOGRAPH_SITE_ORIGIN ?? '') ||
        origin.protocol !== 'https:' || origin.username || origin.password ||
        origin.pathname !== '/' || origin.search || origin.hash || origin.port) {
      throw new Error('PHONOGRAPH_SITE_ORIGIN must be a HTTPS origin without credentials, path or non-default port');
    }
    if (!/^[0-9a-f]{40}$/i.test(env.PHONOGRAPH_RELEASE_ID ?? '')) {
      throw new Error('PHONOGRAPH_RELEASE_ID must be a 40-character commit SHA');
    }
    if (env.PHONOGRAPH_HOST?.trim() && env.PHONOGRAPH_HOST.trim() !== DEFAULT_HOST) {
      throw new Error('Private cloud PHONOGRAPH_HOST must be 127.0.0.1');
    }
    cloud = {siteOrigin: origin.origin, releaseId: env.PHONOGRAPH_RELEASE_ID!.toLowerCase()};
  }
  const dataDir = resolveDataDir(env, cwd);

  return {
    ...(cloud ? {cloud} : {}),
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
