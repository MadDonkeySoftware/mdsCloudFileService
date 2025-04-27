import { v1 } from '@maddonkeysoftware/orid-node';
import type { FastifyRequest } from 'fastify';

export function getOridFromRequest(
  request: FastifyRequest,
  key: string = '',
): v1.V1Orid {
  const { params } = request as { params: Record<string, unknown> };
  request.log.trace({ params }, 'getOridFromRequest');
  let oridString = '';
  if (key && params[key]) {
    oridString = params[key] as string;
  }
  if (params['*']) {
    oridString += params['*'] as string;
  }
  if (!oridString) {
    throw new Error(`Missing orid parameter.`);
  }

  try {
    const orid = v1.parse(oridString);
    orid.useSlashSeparator = true;
    return orid;
  } catch (err) {
    request.log.error({ err, oridString }, 'Failed to parse orid');
    throw new Error('Invalid ORID format encountered.');
  }
}
