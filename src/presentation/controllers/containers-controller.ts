import config from 'config';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { validateToken } from '../hooks/validate-token';
import { v1 } from '@maddonkeysoftware/orid-node';
import { ResourceExistsError } from '../../core/errors/resource-exists-error';
import { validateRequestOridParam } from '../hooks/validate-request-orid-param';
import { validateCanAccessOridParam } from '../hooks/validate-can-access-orid-param';
import { getOridFromRequest } from '../functions/get-orid-from-request';
import { getFileUploadAndFormFields } from '../functions/get-file-upload-and-form-fields';
import { ResourceNotFoundError } from '../../core/errors/resource-not-found-error';

export function containersController(
  app: FastifyInstance,
  opts: FastifyPluginOptions,
  done: (err?: Error) => void,
) {
  app.addHook('onRequest', validateToken);

  app.post<{
    Params: {
      name: string;
    };
  }>(
    '/createContainer/:name',
    {
      schema: {
        response: {
          201: {
            type: 'object',
            properties: {
              orid: {
                type: 'string',
              },
            },
          },
        },
      },
    },
    async (request, response) => {
      const { name } = request.params;
      const parsedToken = request.parsedToken!.payload;
      const newContainerOrid = {
        provider: config.get<string>('oridProviderKey'),
        service: 'fs',
        resourceId: name,
        custom3: parsedToken.accountId,
      } as v1.V1Orid;

      try {
        request.log.debug({ newContainerOrid }, 'Creating container');
        await request.services.logic.createContainerOrDirectory(
          newContainerOrid,
        );
        response.status(201);
        response.send({ orid: v1.generate(newContainerOrid) });
      } catch (err) {
        if (err instanceof ResourceExistsError) {
          response.status(409);
          response.send();
          return;
        }
        throw err;
      }
    },
  );

  app.post(
    '/create/*',
    {
      onRequest: [validateRequestOridParam, validateCanAccessOridParam],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              orid: {
                type: 'string',
              },
            },
          },
        },
      },
    },
    async (request, response) => {
      const orid = getOridFromRequest(request);

      try {
        request.log.debug({ orid }, 'Creating folder in container');
        await request.services.logic.createContainerOrDirectory(orid);
        response.status(201);
        response.send({ orid: v1.generate(orid) });
      } catch (err) {
        if (err instanceof ResourceExistsError) {
          response.status(409);
          response.send();
          return;
        }
        throw err;
      }
    },
  );

  app.post(
    '/upload/*',
    {
      onRequest: [validateRequestOridParam, validateCanAccessOridParam],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              orid: {
                type: 'string',
              },
            },
          },
        },
      },
    },
    async (request, response) => {
      let cleanupCallback: (() => void) | undefined;
      const orid = getOridFromRequest(request);
      try {
        const {
          validationErrors,
          fieldValues,
          cleanupCallback: cb,
        } = await getFileUploadAndFormFields(request, {
          fields: [
            { key: 'file', required: true },
            { key: 'fileName', required: true },
          ],
        });

        cleanupCallback = cb;

        if (validationErrors.length > 0) {
          response.status(400);
          response.send(validationErrors.map((message) => ({ message })));
          request.log.trace(
            { validationErrors },
            'Request could not be processed due to validation failures',
          );
          return;
        }

        request.log.debug(
          { orid, internalFile: fieldValues.file as string },
          'Uploading file',
        );
        const uploadedFileOrid = await request.services.logic.saveFile(
          orid,
          fieldValues.fileName as string,
          fieldValues.file as string,
        );
        response.status(200);
        response.send({ orid: v1.generate(uploadedFileOrid) });
      } catch (err) {
        request.log.error(err, 'Error uploading file');
        throw err;
      } finally {
        if (cleanupCallback) {
          cleanupCallback();
        }
      }
    },
  );

  app.delete(
    '/*',
    {
      onRequest: [validateRequestOridParam, validateCanAccessOridParam],
      schema: {
        response: {
          204: {
            type: 'null',
          },
          404: {
            type: 'null',
          },
        },
      },
    },
    async (request, response) => {
      const orid = getOridFromRequest(request);
      request.log.debug({ orid }, 'Deleting container');
      try {
        await request.services.logic.deleteFileOrDirectory(orid);
        response.status(204);
        response.send();
      } catch (err) {
        if (err instanceof ResourceNotFoundError) {
          response.status(404);
          response.send();
          return;
        }
        throw err;
      }
    },
  );

  app.get(
    '/download/*',
    {
      onRequest: [validateRequestOridParam, validateCanAccessOridParam],
    },
    async (request, response) => {
      const orid = getOridFromRequest(request);
      const { path, filename } =
        request.services.logic.getInternalFilePath(orid);
      request.log.debug({ orid, path, filename }, 'Downloading file');
      return response.sendFile(filename, path, {
        dotfiles: 'allow',
        serveDotFiles: true,
      });
    },
  );

  app.get(
    '/containers',
    {
      schema: {
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                orid: {
                  type: 'string',
                },
                name: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    async (request, response) => {
      const parsedToken = request.parsedToken!.payload;
      const containers = await request.services.logic.getContainers(
        parsedToken.accountId,
      );
      response.status(200);
      response.send(
        containers.map((container) => ({
          orid: container.orid,
          name: container.name,
        })),
      );
    },
  );

  app.get(
    '/list/*',
    {
      onRequest: [validateRequestOridParam, validateCanAccessOridParam],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              directories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    orid: {
                      type: 'string',
                    },
                    name: {
                      type: 'string',
                    },
                  },
                },
              },
              files: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    orid: {
                      type: 'string',
                    },
                    name: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, response) => {
      const orid = getOridFromRequest(request);
      try {
        const contents = await request.services.logic.getContents(orid);
        response.status(200);
        response.send(contents);
      } catch (err) {
        if (err instanceof ResourceNotFoundError) {
          response.status(404);
          response.send();
          return;
        }
        throw err;
      }
    },
  );

  done();
}
