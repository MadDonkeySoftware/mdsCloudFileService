import type { FastifyReply, FastifyRequest } from 'fastify';
import { MdsSdk } from '@maddonkeysoftware/mds-cloud-sdk-node';
import { decode } from 'jsonwebtoken';
import type { IdentityJwtPayload } from '../types/identity-jwt';
import { getOridFromRequest } from '../functions/get-orid-from-request';

export async function allowBasicAuthentication(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { authorization } = request.headers;
  request.log.debug({ authorization }, 'Attempting to authenticate user');
  if (!authorization) {
    request.log.debug('Request missing token.');
    reply.status(403);
    reply.header('content-type', 'text/plain');
    reply.send('Please include authentication token in header "authorization"');
    throw new Error('Missing Authentication Token');
  }

  const [authType, authValue] = authorization.split(' ');
  if (authType.toUpperCase() === 'BASIC') {
    const credentials = Buffer.from(authValue, 'base64').toString('utf-8');
    const [userId, password] = credentials.split(':');

    request.log.debug({ userId }, 'Attempting to authenticate user');
    const inputOrid = getOridFromRequest(request, 'orid');
    const accountId = inputOrid?.custom3;

    if (!accountId) {
      request.log.debug('Request missing account id.');
      reply.status(403);
      reply.header('content-type', 'text/plain');
      reply.send('Please include account id in request');
      throw new Error('Missing Account Id');
    }

    request.log.debug({ accountId, userId }, 'Checking cache for token.');
    const cacheKey = `${accountId}|${userId}`;
    const cacheToken = request.serverCache.get(cacheKey) as string | undefined;

    if (cacheToken) {
      request.headers.token = cacheToken;
      return;
    }

    const client = await MdsSdk.getIdentityServiceClient();
    const result = await client.authenticate({ accountId, userId, password });
    const parsedToken = decode(result) as IdentityJwtPayload;

    let exp: number | undefined;
    if (parsedToken.exp) {
      const bufferMs = 5000; // 5 seconds
      const tokenExp = parsedToken.exp * 1000; // Convert to millisecond
      exp = tokenExp - new Date().getTime() - bufferMs;
    }

    request.serverCache.put(cacheKey, result, exp);
    request.headers.token = result;
  }
}
