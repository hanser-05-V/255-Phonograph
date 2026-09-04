import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';

import type {TaxonomyItem} from '../../shared/contracts.js';
import {withTransaction} from '../db/database.js';

type TaxonomyKind = 'category' | 'tag';

type TaxonomyRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type TaxonomySql = {
  list: string;
  findById: string;
  findDuplicate: string;
  insert: string;
  rename: string;
  delete: string;
};

const SQL: Record<TaxonomyKind, TaxonomySql> = {
  category: {
    list: `
      SELECT id, name, created_at, updated_at
      FROM categories
      ORDER BY normalized_name
    `,
    findById: `
      SELECT id, name, created_at, updated_at
      FROM categories
      WHERE id = ?
    `,
    findDuplicate: `
      SELECT id
      FROM categories
      WHERE normalized_name = ? AND id <> ?
    `,
    insert: `
      INSERT INTO categories (
        id, name, normalized_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
    rename: `
      UPDATE categories
      SET name = ?, normalized_name = ?, updated_at = ?
      WHERE id = ?
    `,
    delete: 'DELETE FROM categories WHERE id = ?',
  },
  tag: {
    list: `
      SELECT id, name, created_at, updated_at
      FROM tags
      ORDER BY normalized_name
    `,
    findById: `
      SELECT id, name, created_at, updated_at
      FROM tags
      WHERE id = ?
    `,
    findDuplicate: `
      SELECT id
      FROM tags
      WHERE normalized_name = ? AND id <> ?
    `,
    insert: `
      INSERT INTO tags (
        id, name, normalized_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)
    `,
    rename: `
      UPDATE tags
      SET name = ?, normalized_name = ?, updated_at = ?
      WHERE id = ?
    `,
    delete: 'DELETE FROM tags WHERE id = ?',
  },
};

function taxonomyLabel(kind: TaxonomyKind): '分类' | '标签' {
  return kind === 'category' ? '分类' : '标签';
}

function toTaxonomyItem(row: TaxonomyRow): TaxonomyItem {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTaxonomyName(
  value: unknown,
  kind: TaxonomyKind,
): {name: string; normalizedName: string} {
  const label = taxonomyLabel(kind);
  if (typeof value !== 'string') {
    throw new TaxonomyError(
      'INVALID_TAXONOMY_NAME',
      `${label}名称长度必须为 1–50 个字符`,
      400,
    );
  }

  const name = value.trim().replace(/\s+/gu, ' ');
  const length = Array.from(name).length;
  if (length < 1 || length > 50) {
    throw new TaxonomyError(
      'INVALID_TAXONOMY_NAME',
      `${label}名称长度必须为 1–50 个字符`,
      400,
    );
  }

  const normalizedName = name
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('zh-CN');
  return {name, normalizedName};
}

export class TaxonomyError extends Error {
  constructor(
    readonly code:
      | 'INVALID_TAXONOMY_NAME'
      | 'TAXONOMY_NAME_CONFLICT'
      | 'TAXONOMY_NOT_FOUND',
    message: string,
    readonly statusCode: 400 | 404 | 409,
  ) {
    super(message);
    this.name = 'TaxonomyError';
  }
}

export class TaxonomyService {
  constructor(
    private readonly db: DatabaseSync,
    private readonly now: () => Date = () => new Date(),
    private readonly generateId: () => string = randomUUID,
  ) {}

  listCategories(): TaxonomyItem[] {
    return this.#list('category');
  }

  createCategory(name: unknown): TaxonomyItem {
    return this.#create('category', name);
  }

  renameCategory(id: string, name: unknown): TaxonomyItem {
    return this.#rename('category', id, name);
  }

  deleteCategory(id: string): void {
    this.#delete('category', id);
  }

  listTags(): TaxonomyItem[] {
    return this.#list('tag');
  }

  createTag(name: unknown): TaxonomyItem {
    return this.#create('tag', name);
  }

  renameTag(id: string, name: unknown): TaxonomyItem {
    return this.#rename('tag', id, name);
  }

  deleteTag(id: string): void {
    this.#delete('tag', id);
  }

  #list(kind: TaxonomyKind): TaxonomyItem[] {
    return (this.db.prepare(SQL[kind].list).all() as TaxonomyRow[]).map(
      toTaxonomyItem,
    );
  }

  #create(kind: TaxonomyKind, input: unknown): TaxonomyItem {
    const {name, normalizedName} = normalizeTaxonomyName(input, kind);

    return withTransaction(this.db, () => {
      this.#assertUnique(kind, normalizedName, '');
      const id = this.generateId();
      const timestamp = this.now().toISOString();
      this.db
        .prepare(SQL[kind].insert)
        .run(id, name, normalizedName, timestamp, timestamp);
      return {id, name, createdAt: timestamp, updatedAt: timestamp};
    });
  }

  #rename(kind: TaxonomyKind, id: string, input: unknown): TaxonomyItem {
    const {name, normalizedName} = normalizeTaxonomyName(input, kind);

    return withTransaction(this.db, () => {
      const current = this.db.prepare(SQL[kind].findById).get(id) as
        | TaxonomyRow
        | undefined;
      if (!current) {
        this.#throwNotFound(kind);
      }

      this.#assertUnique(kind, normalizedName, id);
      const updatedAt = this.now().toISOString();
      this.db.prepare(SQL[kind].rename).run(name, normalizedName, updatedAt, id);
      return {
        id,
        name,
        createdAt: current.created_at,
        updatedAt,
      };
    });
  }

  #delete(kind: TaxonomyKind, id: string): void {
    withTransaction(this.db, () => {
      const result = this.db.prepare(SQL[kind].delete).run(id);
      if (result.changes === 0) {
        this.#throwNotFound(kind);
      }
    });
  }

  #assertUnique(kind: TaxonomyKind, normalizedName: string, ownId: string): void {
    if (this.db.prepare(SQL[kind].findDuplicate).get(normalizedName, ownId)) {
      throw new TaxonomyError(
        'TAXONOMY_NAME_CONFLICT',
        `${taxonomyLabel(kind)}名称已存在`,
        409,
      );
    }
  }

  #throwNotFound(kind: TaxonomyKind): never {
    throw new TaxonomyError(
      'TAXONOMY_NOT_FOUND',
      `${taxonomyLabel(kind)}不存在`,
      404,
    );
  }
}
