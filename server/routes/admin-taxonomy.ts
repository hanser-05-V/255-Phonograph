import type {FastifyInstance} from 'fastify';

import type {TaxonomyItem} from '../../shared/contracts.js';
import {requireAdmin} from '../auth/require-admin.js';
import {
  TaxonomyError,
  type TaxonomyService,
} from '../taxonomy/taxonomy-service.js';

type TaxonomyNameBody = {name: string};
type TaxonomyParams = {id: string};

function readName(body: unknown): string {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    !Object.hasOwn(body, 'name')
  ) {
    throw new TaxonomyError(
      'INVALID_TAXONOMY_NAME',
      '请求只允许包含 name 字段',
      400,
    );
  }

  return (body as {name: unknown}).name as string;
}

export async function registerAdminTaxonomyRoutes(
  app: FastifyInstance,
  service: TaxonomyService,
): Promise<void> {
  app.get<{Reply: TaxonomyItem[]}>(
    '/api/admin/categories',
    {preHandler: requireAdmin},
    async () => service.listCategories(),
  );

  app.post<{Body: TaxonomyNameBody; Reply: TaxonomyItem}>(
    '/api/admin/categories',
    {preHandler: requireAdmin},
    async (request, reply) =>
      reply.status(201).send(service.createCategory(readName(request.body))),
  );

  app.patch<{
    Body: TaxonomyNameBody;
    Params: TaxonomyParams;
    Reply: TaxonomyItem;
  }>(
    '/api/admin/categories/:id',
    {preHandler: requireAdmin},
    async (request) =>
      service.renameCategory(request.params.id, readName(request.body)),
  );

  app.delete<{Params: TaxonomyParams}>(
    '/api/admin/categories/:id',
    {preHandler: requireAdmin},
    async (request, reply) => {
      service.deleteCategory(request.params.id);
      return reply.status(204).send();
    },
  );

  app.get<{Reply: TaxonomyItem[]}>(
    '/api/admin/tags',
    {preHandler: requireAdmin},
    async () => service.listTags(),
  );

  app.post<{Body: TaxonomyNameBody; Reply: TaxonomyItem}>(
    '/api/admin/tags',
    {preHandler: requireAdmin},
    async (request, reply) =>
      reply.status(201).send(service.createTag(readName(request.body))),
  );

  app.patch<{
    Body: TaxonomyNameBody;
    Params: TaxonomyParams;
    Reply: TaxonomyItem;
  }>(
    '/api/admin/tags/:id',
    {preHandler: requireAdmin},
    async (request) => service.renameTag(request.params.id, readName(request.body)),
  );

  app.delete<{Params: TaxonomyParams}>(
    '/api/admin/tags/:id',
    {preHandler: requireAdmin},
    async (request, reply) => {
      service.deleteTag(request.params.id);
      return reply.status(204).send();
    },
  );
}
