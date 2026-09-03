import type {DatabaseSync} from 'node:sqlite';

export function applyInitialMigration(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE media_objects (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('audio', 'cover')),
      storage_key TEXT NOT NULL UNIQUE,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
      created_at TEXT NOT NULL
    );

    CREATE TABLE songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      artist TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'unlisted', 'trashed')),
      status_before_trash TEXT CHECK (
        status_before_trash IS NULL OR status_before_trash IN ('draft', 'unlisted')
      ),
      duration_seconds REAL CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
      audio_media_id TEXT REFERENCES media_objects(id) ON DELETE RESTRICT,
      cover_media_id TEXT REFERENCES media_objects(id) ON DELETE SET NULL,
      lyrics_text TEXT,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      version_note TEXT,
      performance_date TEXT,
      source_url TEXT,
      is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
      is_live_cover INTEGER NOT NULL DEFAULT 0 CHECK (is_live_cover IN (0, 1)),
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE song_tags (
      song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (song_id, tag_id)
    );

    CREATE TABLE pending_uploads (
      id TEXT PRIMARY KEY,
      owner_session_digest TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('audio', 'cover')),
      temporary_key TEXT NOT NULL UNIQUE,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
      duration_seconds REAL CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
      lrc_text TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE admin_config (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      password_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE admin_sessions (
      digest TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE pending_media_cleanup (
      id TEXT PRIMARY KEY,
      storage_key TEXT NOT NULL,
      reason TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX songs_status_published_at_idx
      ON songs (status, published_at DESC);
    CREATE INDEX songs_category_id_idx ON songs (category_id);
    CREATE INDEX song_tags_tag_id_idx ON song_tags (tag_id);
    CREATE INDEX admin_sessions_expires_at_idx ON admin_sessions (expires_at);
  `);
}
