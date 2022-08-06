import type { FastifyInstance, InjectOptions } from 'fastify';
import { buildApp } from '../../index';
import { asClass, asFunction, Lifetime } from 'awilix';
import { Cache } from 'memory-cache';

describe('healthCheckController test', () => {
  let app: FastifyInstance;
  const logicMock = {
    healthChecks: jest.fn(),
  };

  function makeRequest(overrides: InjectOptions = {}) {
    return app.inject({
      ...({
        url: '/health',
        method: 'GET',
      } as InjectOptions),
      ...overrides,
    });
  }

  beforeAll(async () => {
    app = await buildApp(({ diContainer }) => {
      diContainer.register({
        logger: asFunction(() => {
          return {
            trace: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          };
        }),
        serverCache: asClass(Cache, {
          lifetime: Lifetime.SINGLETON,
        }),
        logic: asFunction(() => logicMock, {
          lifetime: Lifetime.SCOPED,
        }),
      });
      return Promise.resolve();
    });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('returns OK', async () => {
    // Act
    const resp = await makeRequest();

    // Assert
    expect(resp.statusCode).toBe(200);
    expect(resp.json()).toEqual({
      serverStatus: 'OK',
    });
  });
});
