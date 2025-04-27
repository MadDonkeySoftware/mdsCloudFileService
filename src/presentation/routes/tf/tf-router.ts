import type { FastifyInstance } from 'fastify';
import { tfStateController } from '../../controllers/tf-state-controller';

export async function tfRouter(app: FastifyInstance) {
  await app.register(tfStateController, { prefix: '/' });
}
