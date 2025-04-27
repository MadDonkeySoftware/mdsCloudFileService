import config from 'config';
import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import fastify from 'fastify';
import type { Cradle } from '@fastify/awilix';
import { fastifyAwilixPlugin, diContainer } from '@fastify/awilix';
import FastifyFormidable from 'fastify-formidable';
import FastifyStatic from '@fastify/static';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { rootRouter } from './routes/root-router';
import type { AwilixContainer } from 'awilix';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { diContainerInit } from './di-container-init';
import type { Logic } from '../core/classes/logic';
import type { CacheClass } from 'memory-cache';

export async function buildApp(
  dependencyInjectionOverride?: ({
    diContainer,
    server,
  }: {
    diContainer: AwilixContainer<Cradle>;
    server: FastifyInstance;
  }) => Promise<void>,
) {
  // Note: The object coming out of the config is immutable. We spread into
  // a new object so that fastify can modify the object internally as it expects
  // to do.
  const opts = config.get<FastifyServerOptions>('fastifyOptions');
  const fastifyOptions: FastifyServerOptions = {
    ...opts,
  };
  const server = fastify(fastifyOptions);
  server.withTypeProvider<TypeBoxTypeProvider>();

  // We ignore the swagger block given that it is only used for development. When
  // enabled it causes errors in the test runner.
  /* istanbul ignore next */
  if (config.get<boolean>('enableSwagger')) {
    server.register(fastifySwagger, {
      swagger: {
        produces: ['application/json'],
        consumes: ['application/json'],
      },
    });

    server.register(fastifySwaggerUi, {
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
  }

  server.register(fastifyAwilixPlugin, {
    disposeOnClose: true,
    disposeOnResponse: true,
  });

  if (dependencyInjectionOverride) {
    await dependencyInjectionOverride({ diContainer, server });
  } else {
    await diContainerInit({ diContainer, server });
  }

  await server.register(FastifyFormidable);

  // Add server-wide hooks that need to be done before routes are processed.
  server.addHook('onRequest', (request, reply, done) => {
    // We proxy all the diScope services here so that the various code editor "find all references" works properly.
    request.serverCache =
      request.diScope.resolve<CacheClass<string, string>>('serverCache');
    request.services = {
      get logic() {
        return request.diScope.resolve<Logic>('logic');
      },
    };

    done();
  });

  // The older terraform provider sends content type application/json with a empty body. Allow this for now until it is fixed.
  server.addHook('preParsing', (request, reply, payload, done) => {
    request.log.trace(
      { headers: request.headers, requestBody: request.body },
      'In preParsing hook',
    );
    if (
      request.headers['content-type'] === 'application/json' &&
      request.headers['content-length'] === '0'
    ) {
      delete request.headers['content-type'];
    }
    done();
  });

  await server.register(FastifyStatic, {
    root: __dirname,
    schemaHide: true,
    serve: false, // Disables serving of files automatically
  });

  // Set up all our routes.
  await server.register(rootRouter);

  return server;
}
