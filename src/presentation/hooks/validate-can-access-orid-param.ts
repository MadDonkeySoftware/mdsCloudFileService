import type { FastifyReply, FastifyRequest } from 'fastify';
import type { v1 } from '@maddonkeysoftware/orid-node';
import { getOridFromRequest } from '../functions/get-orid-from-request';

export function validateCanAccessOridParam(
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: any) => void,
) {
  const logger = request.log;
  let orid: v1.V1Orid | undefined;
  try {
    orid = getOridFromRequest(request);
  } catch (err) {
    logger.debug(err, 'No orid in request');
  }

  if (orid) {
    const tokenAccountId = request.parsedToken?.payload.accountId;
    if (orid.service !== 'fs') {
      logger.debug({ orid }, 'Invalid orid in request');
      reply.status(400);
      reply.send();
      done(new Error('Invalid orid in request'));
      return;
    }

    if (orid.custom3 !== tokenAccountId && tokenAccountId !== '1') {
      logger.debug(
        { tokenAccountId, requestAccount: orid.custom3 },
        'Insufficient privilege for request',
      );
      reply.status(403);
      reply.send();
      done(new Error('Insufficient privilege for request'));
      return;
    }
  }

  done();
}
