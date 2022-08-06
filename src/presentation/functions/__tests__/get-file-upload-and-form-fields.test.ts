import { getFileUploadAndFormFields } from '../get-file-upload-and-form-fields';
import type { FastifyRequest } from 'fastify';
import { kFileSavedPaths } from 'fastify-formidable';
import type * as fsPromises from 'fs/promises';

jest.mock('fs/promises', () => ({
  rm: jest.fn(),
}));
const mockRm = jest.requireMock('fs/promises').rm as jest.MockedFunction<
  typeof fsPromises.rm
>;

describe('get-file-upload-and-form-fields', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Returns validation error when required field missing from payload', async () => {
    // Arrange
    const fakeRequest = {
      parseMultipart: jest.fn().mockResolvedValue({}),
    };

    // Act
    const { validationErrors, fieldValues, cleanupCallback } =
      await getFileUploadAndFormFields(
        fakeRequest as unknown as FastifyRequest,
        {
          fields: [{ key: 'test', required: true }, { key: 'test2' }],
        },
      );

    // Assert
    expect(validationErrors).toEqual(['test missing from payload']);
    expect(fieldValues).toEqual({ test: undefined, test2: undefined });
    expect(cleanupCallback).toBeDefined();
  });

  it('cleanup callback removes files in request payload', async () => {
    // Arrange
    const fakeRequest = {
      parseMultipart: jest.fn().mockResolvedValue({}),
      [kFileSavedPaths]: ['filePath'],
    };
    const { cleanupCallback } = await getFileUploadAndFormFields(
      fakeRequest as unknown as FastifyRequest,
      {
        fields: [{ key: 'test', required: true }, { key: 'test2' }],
      },
    );

    // Act
    await cleanupCallback();

    // Assert
    expect(mockRm).toHaveBeenCalledTimes(1);
    expect(mockRm).toHaveBeenCalledWith('filePath');
  });

  it('Returns fields provided in payload', async () => {
    // Arrange
    const fakeRequest = {
      parseMultipart: jest.fn().mockResolvedValue({
        test: 'test',
      }),
    };

    // Act
    const { validationErrors, fieldValues, cleanupCallback } =
      await getFileUploadAndFormFields(
        fakeRequest as unknown as FastifyRequest,
        {
          fields: [{ key: 'test', required: true }, { key: 'test2' }],
        },
      );

    // Assert
    expect(validationErrors).toEqual([]);
    expect(fieldValues).toEqual({ test: 'test', test2: undefined });
    expect(cleanupCallback).toBeDefined();
  });
});
