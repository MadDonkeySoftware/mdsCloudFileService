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
  const orid = v1.parse(oridString);
  orid.useSlashSeparator = true;
  return orid;
}
