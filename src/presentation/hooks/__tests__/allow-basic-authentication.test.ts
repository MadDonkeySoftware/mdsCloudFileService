import * as jsonwebtoken from 'jsonwebtoken'; // skipcq: JS-C1003
import { allowBasicAuthentication } from '../allow-basic-authentication';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { MdsSdk } from '@maddonkeysoftware/mds-cloud-sdk-node';
import type { IdentityServiceClient } from '@maddonkeysoftware/mds-cloud-sdk-node/clients';

jest.mock('config', () => {
  const actualConfig = jest.requireActual('config');
  return {
    has: actualConfig.has,
    get: (key: string) => {
      if (key === 'oridProviderKey') return 'testIssuer';
      return actualConfig.get(key);
    },
  };
});

jest.mock('jsonwebtoken');
const mockJsonwebtoken = jest.mocked(jsonwebtoken);

function createRequestAndReplyStubs() {
  const request = {
    headers: {} as Record<string, string>,
    params: {} as Record<string, string>,
    serverCache: {
      get: jest.fn(),
      put: jest.fn(),
    },
    log: {
      debug: jest.fn(),
      trace: jest.fn(),
    },
  };
  const reply = {
    status: jest.fn(),
    header: jest.fn(),
    send: jest.fn(),
  };
  return { request, reply };
}

describe('allow-basic-authentication', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('raises error and replies with 403 when request is missing token', async () => {
    // Arrange
    const { request, reply } = createRequestAndReplyStubs();

    // Act & Assert
    await expect(() =>
      allowBasicAuthentication(
        request as unknown as FastifyRequest,
        reply as unknown as FastifyReply,
      ),
    ).rejects.toEqual(new Error('Missing Authentication Token'));
    expect(reply.status).toHaveBeenCalledTimes(1);
    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.header).toHaveBeenCalledTimes(1);
    expect(reply.header).toHaveBeenCalledWith('content-type', 'text/plain');
    expect(reply.send).toHaveBeenCalledTimes(1);
    expect(reply.send).toHaveBeenCalledWith(
      'Please include authentication token in header "authorization"',
    );
  });

  it('raises error and replies with 403 when request is missing account id', async () => {
    // Arrange
    const { request, reply } = createRequestAndReplyStubs();
    request.headers.authorization = 'Basic dGVzdDp0ZXN0';
    request.params['*'] =
      'orid:1:mdsCloud::::fs:test-container-missing-account';

    // Act & Assert
    await expect(() =>
      allowBasicAuthentication(
        request as unknown as FastifyRequest,
        reply as unknown as FastifyReply,
      ),
    ).rejects.toEqual(new Error('Missing Account Id'));
    expect(reply.status).toHaveBeenCalledTimes(1);
    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.header).toHaveBeenCalledTimes(1);
    expect(reply.header).toHaveBeenCalledWith('content-type', 'text/plain');
    expect(reply.send).toHaveBeenCalledTimes(1);
    expect(reply.send).toHaveBeenCalledWith(
      'Please include account id in request',
    );
  });

  it('When token is in cache, it is added to request headers', async () => {
    // Arrange
    const { request, reply } = createRequestAndReplyStubs();
    request.headers.authorization = 'Basic dGVzdDp0ZXN0';
    request.params['*'] =
      'orid:1:mdsCloud:::acct-1:fs:test-container-cached-account';
    request.serverCache.get.mockReturnValue('test-token');

    // Act & Assert
    await expect(
      allowBasicAuthentication(
        request as unknown as FastifyRequest,
        reply as unknown as FastifyReply,
      ),
    ).resolves.toBeUndefined();
    expect(request.headers.token).toEqual('test-token');
    expect(request.serverCache.get).toHaveBeenCalledTimes(1);
    expect(request.serverCache.get).toHaveBeenCalledWith('acct-1|test');
  });

  it('When token is not in cache, it is generated, stored, and added to request headers', async () => {
    // Arrange
    const { request, reply } = createRequestAndReplyStubs();
    request.headers.authorization = 'Basic dGVzdDp0ZXN0';
    request.params['*'] =
      'orid:1:mdsCloud:::acct-1:fs:test-container-cached-account';
    request.serverCache.get.mockReturnValue(undefined);
    const spyMdsSdk = jest.spyOn(MdsSdk, 'getIdentityServiceClient');
    spyMdsSdk.mockResolvedValue({
      authenticate: jest.fn().mockResolvedValue('mds-sdk-auth-token'),
    } as unknown as IdentityServiceClient);
    const nowTime = new Date().getTime();
    mockJsonwebtoken.decode.mockReturnValue({
      exp: nowTime / 1000 + 100,
    });

    // Act & Assert
    await expect(
      allowBasicAuthentication(
        request as unknown as FastifyRequest,
        reply as unknown as FastifyReply,
      ),
    ).resolves.toBeUndefined();
    expect(request.headers.token).toEqual('mds-sdk-auth-token');
    expect(request.serverCache.get).toHaveBeenCalledTimes(1);
    expect(request.serverCache.get).toHaveBeenCalledWith('acct-1|test');
    expect(request.serverCache.put).toHaveBeenCalledTimes(1);
    expect(request.serverCache.put).toHaveBeenCalledWith(
      'acct-1|test',
      'mds-sdk-auth-token',
      expect.any(Number),
    );
  });
});
