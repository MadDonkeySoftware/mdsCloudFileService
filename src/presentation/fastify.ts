import type { CacheClass } from 'memory-cache';
import type { IdentityJwt } from './types/identity-jwt';
import type { Logic } from '../core/classes/logic';

/**
 * Extensions to the base fastify types.
 */
declare module 'fastify' {
  interface FastifyRequest {
    // headers: RawRequest['headers'] & RequestType['headers'] & {
    //   token?: string;
    // };
    parsedToken?: IdentityJwt;
    serverCache: CacheClass<string, string>;
    services: {
      logic: Logic;
    };
  }
}
