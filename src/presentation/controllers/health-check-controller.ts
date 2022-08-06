import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { GetHealthResponseSchema } from '../schemas/health';
import { HealthCheckResult } from '../../core/types/health-check-result';

export function healthCheckController(
  app: FastifyInstance,
  opts: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  app.get(
    '/',
    {
      schema: {
        description: 'Health check',
        tags: ['X-HIDDEN'],
        response: {
          200: GetHealthResponseSchema,
        },
      },
    },
    async (request, response) => {
      response.status(200);
      response.send({ serverStatus: HealthCheckResult.OK });
    },
  );

  done();
}
