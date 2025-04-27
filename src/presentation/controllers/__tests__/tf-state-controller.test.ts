import { v1 } from '@maddonkeysoftware/orid-node';
import { buildApp } from '../../index';
import { asClass, asFunction, Lifetime } from 'awilix';
import type { FastifyInstance, FastifyRequest, InjectOptions } from 'fastify';
import { ResourceNotFoundError } from '../../../core/errors/resource-not-found-error';
import { Cache } from 'memory-cache';
import type { IdentityJwt } from '../../types/identity-jwt';
import { TerraformLockExistsError } from '../../../core/errors/terraform-lock-exists-error';

const fakeOrid = v1.generate({
  service: 'fs',
  resourceId: 'test-container',
  custom3: '1001',
  provider: 'test-provider',
});

jest.mock('../../hooks/allow-basic-authentication', () => ({
  allowBasicAuthentication: (request: FastifyRequest) => {
    request.headers.token = 'test-token';
    return Promise.resolve();
  },
}));
jest.mock('../../hooks/validate-token', () => ({
  validateToken: (request: FastifyRequest) => {
    request.parsedToken = {
      payload: {
        accountId: '1001',
      },
    } as IdentityJwt;
    return Promise.resolve();
  },
}));

describe('tfStateController', () => {
  let app: FastifyInstance;
  const logicMock = {
    healthChecks: jest.fn(),
    getTerraformState: jest.fn(),
    saveTerraformState: jest.fn(),
    removeTerraformMetadata: jest.fn(),
    createTerraformLock: jest.fn(),
    releaseTerraformLock: jest.fn(),
  };

  function makeRequest(overrides: InjectOptions = {}) {
    return app.inject({
      ...({
        url: `/tf/${fakeOrid}`,
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

  describe('GET /tf/', () => {
    it('returns OK if no state file exists', async () => {
      // Arrange
      logicMock.getTerraformState.mockRejectedValueOnce(
        new ResourceNotFoundError('No state file exists'),
      );

      // Act
      const resp = await makeRequest();

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.body).toEqual('');
    });

    it('returns OK and state if state file exists', async () => {
      // Arrange
      const expectedStateBody = JSON.stringify({
        sample: 'state',
      });
      logicMock.getTerraformState.mockResolvedValueOnce(expectedStateBody);

      // Act
      const resp = await makeRequest();

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.body).toEqual(expectedStateBody);
    });

    it('returns 500 if error occurs', async () => {
      // Arrange
      logicMock.getTerraformState.mockRejectedValueOnce(
        new Error('Test error'),
      );

      // Act
      const resp = await makeRequest();

      // Assert
      expect(resp.statusCode).toBe(500);
    });
  });

  describe('POST /tf/', () => {
    it('returns 200 and empty body on success', async () => {
      // Arrange
      logicMock.saveTerraformState.mockResolvedValueOnce(undefined);
      const body = { some: 'state' };

      // Act
      const resp = await makeRequest({
        method: 'POST',
        body,
      });

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.body).toEqual('');
      expect(logicMock.saveTerraformState).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
        body,
      );
    });

    it('throws error if unexpected error occurs', async () => {
      // Arrange
      logicMock.saveTerraformState.mockRejectedValueOnce(
        new Error('Test error'),
      );

      // Act
      const resp = await makeRequest({
        method: 'POST',
      });

      // Assert
      expect(resp.statusCode).toBe(500);
      expect(resp.body).toContain('Internal Server Error');
    });
  });

  describe('DELETE /tf/', () => {
    it('returns 200 and empty body on success', async () => {
      // Arrange
      logicMock.removeTerraformMetadata.mockResolvedValueOnce(undefined);

      // Act
      const resp = await makeRequest({
        method: 'DELETE',
      });

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.body).toEqual('');
      expect(logicMock.removeTerraformMetadata).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });
  });

  describe('LOCK /tf/', () => {
    it('returns 200 and empty body on success', async () => {
      // Arrange
      logicMock.createTerraformLock.mockResolvedValueOnce(undefined);

      // Act
      const resp = await makeRequest({
        method: 'LOCK' as any,
      });

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.body).toEqual('');
      expect(logicMock.createTerraformLock).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });

    it('returns 423 if lock exists', async () => {
      // Arrange
      logicMock.createTerraformLock.mockRejectedValueOnce(
        new TerraformLockExistsError('Test error'),
      );

      // Act
      const resp = await makeRequest({
        method: 'LOCK' as any,
      });

      // Assert
      expect(resp.statusCode).toBe(423);
      expect(logicMock.createTerraformLock).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });

    it('returns 500 if error occurs', async () => {
      // Arrange
      logicMock.createTerraformLock.mockRejectedValueOnce(
        new Error('Test error'),
      );

      // Act
      const resp = await makeRequest({
        method: 'LOCK' as any,
      });

      // Assert
      expect(resp.statusCode).toBe(500);
      expect(logicMock.createTerraformLock).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });
  });

  describe('UNLOCK /tf/', () => {
    it('returns 200 and empty body on success', async () => {
      // Arrange
      logicMock.releaseTerraformLock.mockResolvedValueOnce(undefined);

      // Act
      const resp = await makeRequest({
        method: 'UNLOCK' as any,
      });

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.body).toEqual('');
      expect(logicMock.releaseTerraformLock).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });

    it('returns 410 if lock does not exist', async () => {
      // Arrange
      logicMock.releaseTerraformLock.mockRejectedValueOnce(
        new ResourceNotFoundError('Test error'),
      );

      // Act
      const resp = await makeRequest({
        method: 'UNLOCK' as any,
      });

      // Assert
      expect(resp.statusCode).toBe(410);
      expect(logicMock.releaseTerraformLock).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });

    it('returns 500 if error occurs', async () => {
      // Arrange
      logicMock.releaseTerraformLock.mockRejectedValueOnce(
        new Error('Test error'),
      );

      // Act
      const resp = await makeRequest({
        method: 'UNLOCK' as any,
      });

      // Assert
      expect(resp.statusCode).toBe(500);
      expect(logicMock.releaseTerraformLock).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });
  });
});
