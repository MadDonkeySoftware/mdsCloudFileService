import type { FastifyInstance } from 'fastify';
import { containersController } from '../../controllers/containers-controller';

export async function v1Router(app: FastifyInstance): Promise<void> {
  await app.register(containersController, { prefix: '/' });
}
