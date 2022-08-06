import type { Cradle } from '@fastify/awilix';
import type { AwilixContainer } from 'awilix';
import { asClass, asFunction, Lifetime } from 'awilix';
import config from 'config';
import type { FastifyInstance } from 'fastify';
import { AuthManager as MdsSdkAuthManager } from '@maddonkeysoftware/mds-cloud-sdk-node/lib/auth-manager';
import { InMemoryCache } from '@maddonkeysoftware/mds-cloud-sdk-node/lib';
import { Cache } from 'memory-cache';
import { DiskRepo } from '../infrastructure/repos/disk-repo';
import { Logic } from '../core/classes/logic';

/**
 * Documentation available at https://github.com/jeffijoe/awilix
 * @param args the argument object
 * @param args.diContainer The DI container to configure
 * @param args.server The fastify server instance
 */
export function diContainerInit({
  diContainer,
  server,
}: {
  diContainer: AwilixContainer<Cradle>;
  server: FastifyInstance;
}) {
  // NOTE: Keep the keys in alphabetical order to make it easier to find
  diContainer.register({
    logger: asFunction(
      () => {
        return server.log;
      },
      {
        lifetime: Lifetime.SINGLETON,
      },
    ),

    mdsAuthManager: asFunction(
      () => {
        const mdsSdkConfig = config.get<Record<string, string>>('mdsSdk');
        return new MdsSdkAuthManager({
          cache: new InMemoryCache(),
          ...mdsSdkConfig,
        });
      },
      {
        lifetime: Lifetime.SINGLETON,
      },
    ),

    serverCache: asClass(Cache, {
      lifetime: Lifetime.SINGLETON,
    }),

    diskRepo: asClass(DiskRepo, {
      lifetime: Lifetime.SINGLETON,
    }),

    logic: asClass(Logic, {
      lifetime: Lifetime.SINGLETON,
    }),
  });

  return Promise.resolve();
}
