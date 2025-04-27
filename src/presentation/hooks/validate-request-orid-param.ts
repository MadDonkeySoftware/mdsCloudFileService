import type { FastifyReply, FastifyRequest } from 'fastify';
import { v1 } from '@maddonkeysoftware/orid-node';

export function validateRequestOridParam(
  request: FastifyRequest,
  reply: FastifyReply,
  done: (err?: any) => void,
) {
  const params = request.params as { orid?: string };
  const orid = params.orid;
  if (orid) {
    // NOTE: Orid should have a value at this point.
    const parsedOrid = v1.isValid(orid!) ? v1.parse(orid!) : undefined;

    if (!parsedOrid) {
      reply.status(400);
      reply.header('content-type', 'text/plain');
      reply.send('Resource not understood');
      request.log.debug(
        {
          orid,
          parsedOrid,
        },
        'Resource not understood',
      );
      done(new Error('Missing or malformed ORID'));
      return;
    }
  }

  done();
}
