import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { validateToken } from '../hooks/validate-token';
import { validateRequestOridParam } from '../hooks/validate-request-orid-param';
import { validateCanAccessOridParam } from '../hooks/validate-can-access-orid-param';
import { allowBasicAuthentication } from '../hooks/allow-basic-authentication';
import { getOridFromRequest } from '../functions/get-orid-from-request';
import { TerraformLockExistsError } from '../../core/errors/terraform-lock-exists-error';
import { ResourceNotFoundError } from '../../core/errors/resource-not-found-error';

export function tfStateController(
  app: FastifyInstance,
  opts: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  app.addHook('onRequest', allowBasicAuthentication);
  app.addHook('onRequest', validateToken);
  app.addHook('preHandler', validateRequestOridParam);
  app.addHook('preHandler', validateCanAccessOridParam);

  app.get(
    '/*',
    {
      schema: {
        tags: ['Terraform'],
        response: {
          200: {
            type: 'string',
          },
        },
      },
    },
    async (request, response) => {
      const orid = getOridFromRequest(request);
      try {
        const body = await request.services.logic.getTerraformState(orid);
        response.status(200);
        response.send(body);
      } catch (err) {
        if (err instanceof ResourceNotFoundError) {
          // NOTE: TF expects the state to be blank if it doesn't exist.
          response.status(200);
          response.send();
          return;
        }
        throw err;
      }
    },
  );

  app.post(
    '/*',
    {
      schema: {
        tags: ['Terraform'],
        response: {
          200: {
            type: 'string',
          },
        },
      },
    },
    async (request, response) => {
      const orid = getOridFromRequest(request);
      const { body } = request;
      await request.services.logic.saveTerraformState(orid, body);
      response.status(200);
      response.send();
    },
  );

  app.delete(
    '/*',
    {
      schema: {
        tags: ['Terraform'],
        response: {
          200: {
            type: 'string',
          },
        },
      },
    },
    async (request, response) => {
      const orid = getOridFromRequest(request);
      await request.services.logic.removeTerraformMetadata(orid);
      response.status(200);
      response.send();
    },
  );

  app.route({
    method: 'LOCK',
    url: '/*',
    schema: {
      tags: ['Terraform'],
      response: {
        200: {
          type: 'string',
        },
      },
    },
    handler: async (request, response) => {
      const orid = getOridFromRequest(request);
      try {
        await request.services.logic.createTerraformLock(orid);
        response.status(200);
        response.send();
      } catch (err) {
        if (err instanceof TerraformLockExistsError) {
          response.status(423);
          response.send();
          return;
        }
        throw err;
      }
    },
  });

  app.route({
    method: 'UNLOCK',
    url: '/*',
    schema: {
      tags: ['Terraform'],
      response: {
        200: {
          type: 'string',
        },
      },
    },
    handler: async (request, response) => {
      const orid = getOridFromRequest(request);
      try {
        await request.services.logic.releaseTerraformLock(orid);
        response.status(200);
        response.send();
      } catch (err) {
        if (err instanceof ResourceNotFoundError) {
          response.status(410);
          response.send();
          return;
        }
        throw err;
      }
    },
  });

  done();
}
