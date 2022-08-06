import { getOridFromRequest } from '../get-orid-from-request';
import { v1 } from '@maddonkeysoftware/orid-node';

describe('get-orid-from-request', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('raises error when orid missing from request', () => {
    // Arrange
    const request = {
      params: {},
      log: {
        trace: jest.fn(),
      },
    };

    // Act & Assert
    expect(() => getOridFromRequest(request as any)).toThrow(
      'Missing orid parameter.',
    );
  });

  it('returns orid from specific request parameter request', () => {
    // Arrange
    const testOrid = 'orid:1:test-provider:::1001:fs:test-container';
    const request = {
      params: {
        key: testOrid,
      },
      log: {
        trace: jest.fn(),
      },
    };

    // Act
    const result = getOridFromRequest(request as any, 'key');

    // Assert
    expect(result).toBeDefined();
    expect(result).toEqual(expect.objectContaining(v1.parse(testOrid)));
  });

  it('returns orid from request', () => {
    // Arrange
    const testOrid = 'orid:1:test-provider:::1001:fs:test-container';
    const request = {
      params: {
        '*': testOrid,
      },
      log: {
        trace: jest.fn(),
      },
    };

    // Act
    const result = getOridFromRequest(request as any);

    // Assert
    expect(result).toBeDefined();
    expect(result).toEqual(expect.objectContaining(v1.parse(testOrid)));
  });
});
