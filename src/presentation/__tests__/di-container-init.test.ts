import { diContainerInit } from '../di-container-init';
import { diContainer } from '@fastify/awilix';
import type { FastifyInstance } from 'fastify';

describe('di-container-init', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('registers expected items', async () => {
    try {
      // Arrange
      const fakeServer = {
        log: {},
      } as unknown as FastifyInstance;
      await diContainerInit({ diContainer, server: fakeServer });

      // Act
      const logger = diContainer.resolve('logger');
      const logic = diContainer.resolve('logic');
      const mdsAuthManager = diContainer.resolve('mdsAuthManager');

      // Assert
      expect(logger).not.toBeNull();
      expect(logic).not.toBeNull();
      expect(mdsAuthManager).not.toBeNull();
    } finally {
      await diContainer.dispose();
    }
  });
});
