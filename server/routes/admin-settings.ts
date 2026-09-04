import type {FastifyInstance} from 'fastify';

import {requireAdmin} from '../auth/require-admin.js';

type AdminSettingsResponse = {
  dataDirectoryDisplay: string;
};

export async function registerAdminSettingsRoutes(
  app: FastifyInstance,
  dataDirectoryDisplay: string,
): Promise<void> {
  app.get<{Reply: AdminSettingsResponse}>(
    '/api/admin/settings',
    {preHandler: requireAdmin},
    async () => ({dataDirectoryDisplay}),
  );
}
