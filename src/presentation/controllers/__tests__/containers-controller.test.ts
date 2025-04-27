import { v1 } from '@maddonkeysoftware/orid-node';
import { buildApp } from '../../index';
import { asClass, asFunction, Lifetime } from 'awilix';
import type { FastifyInstance, FastifyRequest, InjectOptions } from 'fastify';
import { Cache } from 'memory-cache';
import formAutoContent from 'form-auto-content';
import { basename } from 'path';
import type { IdentityJwt } from '../../types/identity-jwt';
import { ResourceExistsError } from '../../../core/errors/resource-exists-error';
import { ResourceNotFoundError } from '../../../core/errors/resource-not-found-error';

const fakeOrid = v1.generate({
  service: 'fs',
  resourceId: 'test-container',
  custom3: '1001',
  provider: 'test-provider',
});

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

describe('containersController', () => {
  let app: FastifyInstance;
  const logicMock = {
    healthChecks: jest.fn(),
    createContainerOrDirectory: jest.fn(),
    saveFile: jest.fn(),
    deleteFileOrDirectory: jest.fn(),
    getInternalFilePath: jest.fn(),
    getContainers: jest.fn(),
    getContents: jest.fn(),
  };

  function makeRequest(overrides: InjectOptions = {}) {
    return app.inject({
      ...({
        url: `/containers/${fakeOrid}`,
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  describe('POST /createContainer/:name', () => {
    it('returns 201 and orid on success', async () => {
      // Arrange
      logicMock.createContainerOrDirectory.mockResolvedValueOnce(undefined);
      const name = 'test-container';

      // Act
      const resp = await makeRequest({
        method: 'POST',
        url: `/v1/createContainer/${name}`,
      });

      // Assert
      expect(resp.statusCode).toBe(201);
      expect(resp.json()).toEqual({
        orid: v1.generate({
          provider: 'test-provider',
          resourceId: name,
          service: 'fs',
          custom3: '1001',
        }),
      });
      expect(logicMock.createContainerOrDirectory).toHaveBeenCalledWith({
        custom3: '1001',
        provider: 'test-provider',
        resourceId: name,
        service: 'fs',
      });
    });

    it('returns 201 and orid on success (legacy terraform provider request)', async () => {
      // Arrange
      logicMock.createContainerOrDirectory.mockResolvedValueOnce(undefined);
      const name = 'test-container-legacy-terraform-provider';

      // Act
      const resp = await makeRequest({
        method: 'POST',
        url: `/v1/createContainer/${name}`,
        headers: {
          'content-type': 'application/json',
          'content-length': '0',
        },
      });

      // Assert
      expect(resp.statusCode).toBe(201);
      expect(resp.json()).toEqual({
        orid: v1.generate({
          provider: 'test-provider',
          resourceId: name,
          service: 'fs',
          custom3: '1001',
        }),
      });
      expect(logicMock.createContainerOrDirectory).toHaveBeenCalledWith({
        custom3: '1001',
        provider: 'test-provider',
        resourceId: name,
        service: 'fs',
      });
    });

    it('returns 409 if container already exists', async () => {
      // Arrange
      logicMock.createContainerOrDirectory.mockRejectedValueOnce(
        new ResourceExistsError('Container already exists'),
      );
      const name = 'test-container';

      // Act
      const resp = await makeRequest({
        method: 'POST',
        url: `/v1/createContainer/${name}`,
      });

      // Assert
      expect(resp.statusCode).toBe(409);
      expect(logicMock.createContainerOrDirectory).toHaveBeenCalledWith({
        custom3: '1001',
        provider: 'test-provider',
        resourceId: name,
        service: 'fs',
      });
    });

    it('returns 500 if error occurs', async () => {
      // Arrange
      logicMock.createContainerOrDirectory.mockRejectedValueOnce(
        new Error('Test error'),
      );
      const name = 'test-container';

      // Act
      const resp = await makeRequest({
        method: 'POST',
        url: `/v1/createContainer/${name}`,
      });

      // Assert
      expect(resp.statusCode).toBe(500);
      expect(logicMock.createContainerOrDirectory).toHaveBeenCalledWith({
        custom3: '1001',
        provider: 'test-provider',
        resourceId: name,
        service: 'fs',
      });
    });
  });

  describe('POST /create/*', () => {
    it('returns 201 and orid on success', async () => {
      // Arrange
      logicMock.createContainerOrDirectory.mockResolvedValueOnce(undefined);
      const path = 'test-folder';

      // Act
      const resp = await makeRequest({
        method: 'POST',
        url: `/v1/create/${fakeOrid}/${path}`,
      });

      // Assert
      expect(resp.statusCode).toBe(201);
      expect(resp.json()).toEqual({
        orid: v1.generate({
          provider: 'test-provider',
          resourceId: 'test-container',
          resourceRider: path,
          service: 'fs',
          custom3: '1001',
          useSlashSeparator: true,
        }),
      });
      expect(logicMock.createContainerOrDirectory).toHaveBeenCalledWith(
        expect.objectContaining({
          ...v1.parse(`${fakeOrid}/${path}`),
        }),
      );
    });

    it('returns 409 if folder already exists', async () => {
      // Arrange
      logicMock.createContainerOrDirectory.mockRejectedValueOnce(
        new ResourceExistsError('Folder already exists'),
      );
      const path = 'test-folder';

      // Act
      const resp = await makeRequest({
        method: 'POST',
        url: `/v1/create/${fakeOrid}/${path}`,
      });

      // Assert
      expect(resp.statusCode).toBe(409);
      expect(logicMock.createContainerOrDirectory).toHaveBeenCalledWith(
        expect.objectContaining({
          ...v1.parse(`${fakeOrid}/${path}`),
        }),
      );
    });

    it('returns 500 if error occurs', async () => {
      // Arrange
      logicMock.createContainerOrDirectory.mockRejectedValueOnce(
        new Error('Test error'),
      );
      const path = 'test-folder';

      // Act
      const resp = await makeRequest({
        method: 'POST',
        url: `/v1/create/${fakeOrid}/${path}`,
      });

      // Assert
      expect(resp.statusCode).toBe(500);
      expect(logicMock.createContainerOrDirectory).toHaveBeenCalledWith(
        expect.objectContaining({
          ...v1.parse(`${fakeOrid}/${path}`),
        }),
      );
    });
  });

  describe('POST /upload/*', () => {
    it('returns 200 and orid on successful file upload', async () => {
      // Arrange
      logicMock.saveFile.mockResolvedValueOnce({
        ...v1.parse(fakeOrid + '/test-file'),
        useSlashSeparator: true,
      });
      const fileName = 'test-file';
      const fileContent = 'test content';
      const form = formAutoContent({
        file: Buffer.from(fileContent),
        fileName,
      });

      // Act
      const resp = await makeRequest({
        method: 'POST',
        url: `/v1/upload/${fakeOrid}/${fileName}`,
        ...form,
      });

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.json()).toEqual({
        orid: v1.generate({
          provider: 'test-provider',
          resourceId: 'test-container',
          resourceRider: fileName,
          service: 'fs',
          custom3: '1001',
          useSlashSeparator: true,
        }),
      });
      expect(logicMock.saveFile).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(`${fakeOrid}/${fileName}`)),
        fileName,
        expect.any(String),
      );
    });

    it('returns 400 if validation fails', async () => {
      // Arrange
      const fileContent = 'test content';
      const form = formAutoContent({
        file: Buffer.from(fileContent),
      });

      // Act
      const resp = await makeRequest({
        method: 'POST',
        url: `/v1/upload/${fakeOrid}`,
        ...form,
      });

      // Assert
      expect(resp.statusCode).toBe(400);
      expect(resp.json()).toEqual([
        {
          message: 'fileName missing from payload',
        },
      ]);
      expect(logicMock.saveFile).not.toHaveBeenCalled();
    });

    it('returns 500 if error occurs', async () => {
      // Arrange
      logicMock.saveFile.mockRejectedValueOnce(new Error('Test error'));
      const fileName = 'test-file';
      const fileContent = 'test content';
      const form = formAutoContent({
        file: Buffer.from(fileContent),
        fileName,
      });

      // Act
      const resp = await makeRequest({
        method: 'POST',
        url: `/v1/upload/${fakeOrid}/${fileName}`,
        ...form,
      });

      // Assert
      expect(resp.statusCode).toBe(500);
      expect(logicMock.saveFile).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(`${fakeOrid}/${fileName}`)),
        fileName,
        expect.any(String),
      );
    });
  });

  describe('DELETE /delete/*', () => {
    it('returns 204 on successful deletion', async () => {
      // Arrange
      logicMock.deleteFileOrDirectory.mockResolvedValueOnce(undefined);

      // Act
      const resp = await makeRequest({
        method: 'DELETE',
        url: `/v1/${fakeOrid}`,
      });

      // Assert
      expect(resp.statusCode).toBe(204);
      expect(logicMock.deleteFileOrDirectory).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });

    it('returns 500 if error occurs', async () => {
      // Arrange
      logicMock.deleteFileOrDirectory.mockRejectedValueOnce(
        new Error('Test error'),
      );

      // Act
      const resp = await makeRequest({
        method: 'DELETE',
        url: `/v1/${fakeOrid}`,
      });

      // Assert
      expect(resp.statusCode).toBe(500);
      expect(logicMock.deleteFileOrDirectory).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });
  });

  describe('GET /download/*', () => {
    it('returns 200 and downloads the file on success', async () => {
      // Arrange
      const filePath = __dirname;
      const fileName = basename(__filename);
      logicMock.getInternalFilePath.mockReturnValueOnce({
        path: filePath,
        filename: fileName,
      });

      // Act
      const resp = await makeRequest({
        method: 'GET',
        url: `/v1/download/${fakeOrid}/${fileName}`,
      });

      // Assert
      expect(resp.body).toContain("describe('containersController', () => {");
      expect(resp.statusCode).toBe(200);
      // TODO: Figure out how to get fastify static to set the headers appropriately
      // expect(resp.headers['content-disposition']).toBe(
      //   `attachment; filename="${fileName}"`,
      // );
      // expect(resp.headers['content-type']).toBe('application/octet-stream');
      expect(logicMock.getInternalFilePath).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(`${fakeOrid}/${fileName}`)),
      );
    });

    it('returns 404 if file does not exist', async () => {
      // Arrange
      const filePath = __dirname;
      const fileName = 'non-existent-file';
      logicMock.getInternalFilePath.mockReturnValueOnce({
        path: filePath,
        filename: fileName,
      });

      // Act
      const resp = await makeRequest({
        method: 'GET',
        url: `/v1/download/${fakeOrid}/${fileName}`,
      });

      // Assert
      expect(resp.statusCode).toBe(404);
      expect(logicMock.getInternalFilePath).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(`${fakeOrid}/${fileName}`)),
      );
    });

    it('returns 500 if error occurs', async () => {
      const fileName = 'non-existent-file';
      logicMock.getInternalFilePath.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      // Act
      const resp = await makeRequest({
        method: 'GET',
        url: `/v1/download/${fakeOrid}/${fileName}`,
      });

      // Assert
      expect(resp.statusCode).toBe(500);
      expect(logicMock.getInternalFilePath).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(`${fakeOrid}/${fileName}`)),
      );
    });
  });

  describe('GET /containers', () => {
    it('returns 200 and containers on success', async () => {
      // Arrange
      const containers = [
        { name: 'container1', orid: 'orid1' },
        { name: 'container2', orid: 'orid2' },
      ];
      logicMock.getContainers.mockResolvedValueOnce(containers);

      // Act
      const resp = await makeRequest({
        method: 'GET',
        url: '/v1/containers',
      });

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.json()).toEqual(containers);
      expect(logicMock.getContainers).toHaveBeenCalled();
    });

    it('returns 200 and empty array if no containers exist', async () => {
      // Arrange
      logicMock.getContainers.mockResolvedValueOnce([]);

      // Act
      const resp = await makeRequest({
        method: 'GET',
        url: '/v1/containers',
      });

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.json()).toEqual([]);
      expect(logicMock.getContainers).toHaveBeenCalled();
    });
  });

  describe('GET /list/*', () => {
    it('returns 200 and contents on success', async () => {
      // Arrange
      const contents = {
        files: [
          { name: 'file1', orid: 'orid1' },
          { name: 'file2', orid: 'orid2' },
        ],
        directories: [
          { name: 'dir1', orid: 'orid3' },
          { name: 'dir2', orid: 'orid4' },
        ],
      };
      logicMock.getContents.mockResolvedValueOnce(contents);

      // Act
      const resp = await makeRequest({
        method: 'GET',
        url: `/v1/list/${fakeOrid}`,
      });

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.json()).toEqual(contents);
      expect(logicMock.getContents).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });

    it('returns 200 and empty arrays if no contents exist', async () => {
      // Arrange
      const contents = { files: [], directories: [] };
      logicMock.getContents.mockResolvedValueOnce(contents);

      // Act
      const resp = await makeRequest({
        method: 'GET',
        url: `/v1/list/${fakeOrid}`,
      });

      // Assert
      expect(resp.statusCode).toBe(200);
      expect(resp.json()).toEqual(contents);
      expect(logicMock.getContents).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });

    it('returns 404 if container does not exist', async () => {
      // Arrange
      logicMock.getContents.mockRejectedValueOnce(new ResourceNotFoundError());

      // Act
      const resp = await makeRequest({
        method: 'GET',
        url: `/v1/list/${fakeOrid}`,
      });

      // Assert
      expect(resp.statusCode).toBe(404);
      expect(logicMock.getContents).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });

    it('returns 500 if error occurs', async () => {
      // Arrange
      logicMock.getContents.mockRejectedValueOnce(new Error('Test error'));

      // Act
      const resp = await makeRequest({
        method: 'GET',
        url: `/v1/list/${fakeOrid}`,
      });

      // Assert
      expect(resp.statusCode).toBe(500);
      expect(logicMock.getContents).toHaveBeenCalledWith(
        expect.objectContaining(v1.parse(fakeOrid)),
      );
    });
  });
});
