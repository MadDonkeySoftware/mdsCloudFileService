import { validateCanAccessOridParam } from '../validate-can-access-orid-param';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IdentityJwt } from '../../types/identity-jwt';

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

describe('validate-can-access-orid-param', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('invokes next middleware when no orid param', () => {
    // Arrange
    const request: {
      parsedToken: IdentityJwt | undefined;
      params: Record<string, string>;
      log: {
        debug: (arg: unknown) => void;
      };
    } = {
      parsedToken: undefined,
      params: {},
      log: {
        debug: jest.fn(),
      },
    };
    const done = jest.fn();

    // Act
    validateCanAccessOridParam(
      request as FastifyRequest,
      {} as FastifyReply,
      done,
    );

    // Assert
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith();
  });

  it('invokes next middleware when request token allows edit of request orid', () => {
    // Arrange
    const request: {
      parsedToken: IdentityJwt | undefined;
      params: Record<string, string>;
      log: {
        debug: (arg: unknown) => void;
      };
    } = {
      parsedToken: {
        payload: {
          accountId: '1234',
        },
      } as IdentityJwt,
      params: {
        '*': 'orid:1:testIssuer:::1234:qs:5678',
      },
      log: {
        debug: jest.fn(),
      },
    };
    const done = jest.fn();

    // Act
    validateCanAccessOridParam(
      request as FastifyRequest,
      {} as FastifyReply,
      done,
    );

    // Assert
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith();
  });

  it('invokes next middleware when request token from system', () => {
    // Arrange
    const request: {
      parsedToken: IdentityJwt | undefined;
      params: Record<string, string>;
      log: {
        debug: (arg: unknown) => void;
      };
    } = {
      parsedToken: {
        payload: {
          accountId: '1',
        },
      } as IdentityJwt,
      params: {
        '*': 'orid:1:testIssuer:::1234:qs:5678',
      },
      log: {
        debug: jest.fn(),
      },
    };
    const done = jest.fn();

    // Act
    validateCanAccessOridParam(
      request as FastifyRequest,
      {} as FastifyReply,
      done,
    );

    // Assert
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith();
  });

  it('raises error and replies with bad request when invalid orid in params', () => {
    // Arrange
    const request: {
      parsedToken: IdentityJwt | undefined;
      params: Record<string, string>;
      log: {
        debug: (arg: unknown) => void;
        trace: (arg: unknown) => void;
      };
    } = {
      parsedToken: {
        payload: {
          accountId: '1234',
        },
      } as IdentityJwt,
      params: {
        '*': 'orid:1:testIssuer:::2345:qs:5678',
      },
      log: {
        debug: jest.fn(),
        trace: jest.fn(),
      },
    };
    const reply: {
      status: () => void;
      send: (arg: unknown) => void;
    } = {
      status: jest.fn(),
      send: jest.fn(),
    };
    const done = jest.fn();

    // Act
    validateCanAccessOridParam(
      request as FastifyRequest,
      reply as unknown as FastifyReply,
      done,
    );

    // Assert
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(new Error('Invalid orid in request'));
    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith();
  });

  it('raises error and replies with forbidden when insufficient privilege for request', () => {
    // Arrange
    const request: {
      parsedToken: IdentityJwt | undefined;
      params: Record<string, string>;
      log: {
        debug: (arg: unknown) => void;
        trace: (arg: unknown) => void;
      };
    } = {
      parsedToken: {
        payload: {
          accountId: '1234',
        },
      } as IdentityJwt,
      params: {
        '*': 'orid:1:testIssuer:::2345:fs:5678',
      },
      log: {
        debug: jest.fn(),
        trace: jest.fn(),
      },
    };
    const reply: {
      status: () => void;
      send: (arg: unknown) => void;
    } = {
      status: jest.fn(),
      send: jest.fn(),
    };
    const done = jest.fn();

    // Act
    validateCanAccessOridParam(
      request as FastifyRequest,
      reply as unknown as FastifyReply,
      done,
    );

    // Assert
    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(
      new Error('Insufficient privilege for request'),
    );
    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith();
  });
});
