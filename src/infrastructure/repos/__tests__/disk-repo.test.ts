import config from 'config';
import { DiskRepo } from '../disk-repo';
import { v1 } from '@maddonkeysoftware/orid-node';
import * as fs from 'fs';
import * as del from 'del';
import type { Dirent } from 'fs';

const TEST_ACCOUNT = '1001';
const TEST_RESOURCE = 'test-resource';
const TEST_ORID_STRING = `orid:1:${config.get<string>('oridProviderKey')}:::${TEST_ACCOUNT}:fs:${TEST_RESOURCE}`;
const TEST_UPLOAD_DIR = config.get<string>('uploadFolder');

jest.mock('del');
const mockDel = del as jest.Mocked<typeof del>;

describe('disk-repo', () => {
  describe('doesFileExist', () => {
    it('should return true if file exists', async () => {
      // Arrange
      const accessSpy = jest.spyOn(fs.promises, 'access');
      accessSpy.mockImplementationOnce(() => Promise.resolve());
      const repo = new DiskRepo();
      const orid = v1.parse(TEST_ORID_STRING);

      // Act
      const result = await repo.doesFileExist(orid);

      // Assert
      expect(result).toBe(true);
      expect(accessSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}`,
        fs.constants.F_OK,
      );
    });

    it('should return true if file exists in nested directory', async () => {
      // Arrange
      const accessSpy = jest.spyOn(fs.promises, 'access');
      accessSpy.mockImplementationOnce(() => Promise.resolve());
      const repo = new DiskRepo();
      const orid = v1.parse(`${TEST_ORID_STRING}/nested`);

      // Act
      const result = await repo.doesFileExist(orid);

      // Assert
      expect(result).toBe(true);
      expect(accessSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}/nested`,
        fs.constants.F_OK,
      );
    });

    it('should return false if file does not exist', async () => {
      // Arrange
      const accessSpy = jest.spyOn(fs.promises, 'access');
      accessSpy.mockImplementationOnce(() => Promise.reject());
      const repo = new DiskRepo();
      const orid = v1.parse(TEST_ORID_STRING);

      // Act
      const result = await repo.doesFileExist(orid);

      // Assert
      expect(result).toBe(false);
      expect(accessSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}`,
        fs.constants.F_OK,
      );
    });
  });

  describe('writeFile', () => {
    it('should write file', async () => {
      // Arrange
      const writeFileSpy = jest.spyOn(fs.promises, 'writeFile');
      writeFileSpy.mockImplementationOnce(() => Promise.resolve());
      const repo = new DiskRepo();
      const orid = v1.parse(TEST_ORID_STRING);
      const data = 'test data';

      // Act
      await repo.writeFile(orid, data);

      // Assert
      expect(writeFileSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}`,
        data,
      );
    });

    it('should write file to nested directory', async () => {
      // Arrange
      const writeFileSpy = jest.spyOn(fs.promises, 'writeFile');
      writeFileSpy.mockImplementationOnce(() => Promise.resolve());
      const repo = new DiskRepo();
      const orid = v1.parse(`${TEST_ORID_STRING}/nested`);
      const data = 'test data';

      // Act
      await repo.writeFile(orid, data);

      // Assert
      expect(writeFileSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}/nested`,
        data,
      );
    });
  });

  describe('delete', () => {
    it('should delete file', async () => {
      // Arrange
      mockDel.default.mockImplementationOnce(() => Promise.resolve([]));
      const repo = new DiskRepo();
      const orid = v1.parse(TEST_ORID_STRING);

      // Act
      await repo.delete(orid);

      // Assert
      expect(mockDel.default).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}`,
      );
    });

    it('should delete file in nested directory', async () => {
      // Arrange
      mockDel.default.mockImplementationOnce(() => Promise.resolve([]));
      const repo = new DiskRepo();
      const orid = v1.parse(`${TEST_ORID_STRING}/nested`);

      // Act
      await repo.delete(orid);

      // Assert
      expect(mockDel.default).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}/nested`,
      );
    });
  });

  describe('readFile', () => {
    it('should read file', async () => {
      // Arrange
      const readFileSpy = jest.spyOn(fs.promises, 'readFile');
      readFileSpy.mockImplementationOnce(() =>
        Promise.resolve(Buffer.from('some data')),
      );
      const repo = new DiskRepo();
      const orid = v1.parse(TEST_ORID_STRING);

      // Act
      const data = await repo.readFile(orid);

      // Assert
      expect(data.toString()).toBe('some data');
      expect(readFileSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}`,
      );
    });

    it('should read file in nested directory', async () => {
      // Arrange
      const readFileSpy = jest.spyOn(fs.promises, 'readFile');
      readFileSpy.mockImplementationOnce(() =>
        Promise.resolve(Buffer.from('some data')),
      );
      const repo = new DiskRepo();
      const orid = v1.parse(`${TEST_ORID_STRING}/nested`);

      // Act
      const data = await repo.readFile(orid);

      // Assert
      expect(data.toString()).toBe('some data');
      expect(readFileSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}/nested`,
      );
    });
  });

  describe('createDirectory', () => {
    it('should create directory', async () => {
      // Arrange
      const mkdirSpy = jest.spyOn(fs.promises, 'mkdir');
      mkdirSpy.mockImplementationOnce(() => Promise.resolve(undefined));
      const repo = new DiskRepo();
      const orid = v1.parse(TEST_ORID_STRING);

      // Act
      await repo.createDirectory(orid);

      // Assert
      expect(mkdirSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}`,
        { recursive: true },
      );
    });

    it('should create directory in nested directory', async () => {
      // Arrange
      const mkdirSpy = jest.spyOn(fs.promises, 'mkdir');
      mkdirSpy.mockImplementationOnce(() => Promise.resolve(undefined));
      const repo = new DiskRepo();
      const orid = v1.parse(`${TEST_ORID_STRING}/nested`);

      // Act
      await repo.createDirectory(orid);

      // Assert
      expect(mkdirSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}/nested`,
        { recursive: true },
      );
    });
  });

  describe('moveFile', () => {
    it('should move file', async () => {
      // Arrange
      const copyFileSpy = jest.spyOn(fs.promises, 'copyFile');
      copyFileSpy.mockImplementationOnce(() => Promise.resolve(undefined));
      const repo = new DiskRepo();
      const orid = v1.parse(TEST_ORID_STRING);
      const file = 'some-file';

      // Act
      await repo.moveFile(orid, file);

      // Assert
      expect(copyFileSpy).toHaveBeenCalledWith(
        file,
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}`,
      );
    });

    it('should move file to nested directory', async () => {
      // Arrange
      const copyFileSpy = jest.spyOn(fs.promises, 'copyFile');
      copyFileSpy.mockImplementationOnce(() => Promise.resolve(undefined));
      const repo = new DiskRepo();
      const orid = v1.parse(`${TEST_ORID_STRING}/nested`);
      const file = 'some-file';

      // Act
      await repo.moveFile(orid, file);

      // Assert
      expect(copyFileSpy).toHaveBeenCalledWith(
        file,
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}/nested`,
      );
    });
  });

  describe('getInternalFilePath', () => {
    it('should return correct path', () => {
      // Arrange
      const repo = new DiskRepo();
      const orid = v1.parse(`${TEST_ORID_STRING}/some-file.txt`);

      // Act
      const result = repo.getInternalFilePath(orid);

      // Assert
      expect(result).toEqual({
        path: `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}`,
        filename: 'some-file.txt',
      });
    });

    it('should return correct path for nested directory', () => {
      // Arrange
      const repo = new DiskRepo();
      const orid = v1.parse(`${TEST_ORID_STRING}/nested/some-file.txt`);

      // Act
      const result = repo.getInternalFilePath(orid);

      // Assert
      expect(result).toEqual({
        path: `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}/nested`,
        filename: 'some-file.txt',
      });
    });
  });

  describe('getContainers', () => {
    it('should return empty array if directory does not exist', async () => {
      // Arrange
      const accessSpy = jest.spyOn(fs.promises, 'access');
      accessSpy.mockImplementationOnce(() => Promise.reject());
      const repo = new DiskRepo();
      const accountId = '1001';

      // Act
      const result = await repo.getContainers(accountId);

      // Assert
      expect(result).toEqual([]);
      expect(accessSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${accountId}`,
        fs.constants.F_OK,
      );
    });

    it('should return empty array if directory is empty', async () => {
      // Arrange
      const accessSpy = jest.spyOn(fs.promises, 'access');
      accessSpy.mockImplementationOnce(() => Promise.resolve());
      const readdirSpy = jest.spyOn(fs.promises, 'readdir');
      readdirSpy.mockImplementationOnce(() => Promise.resolve([]));
      const repo = new DiskRepo();
      const accountId = '1001';

      // Act
      const result = await repo.getContainers(accountId);

      // Assert
      expect(result).toEqual([]);
      expect(accessSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${accountId}`,
        fs.constants.F_OK,
      );
      expect(readdirSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${accountId}`,
        { withFileTypes: true },
      );
    });

    it('should return containers', async () => {
      // Arrange
      const accessSpy = jest.spyOn(fs.promises, 'access');
      accessSpy.mockImplementationOnce(() => Promise.resolve());
      const readdirSpy = jest.spyOn(fs.promises, 'readdir');
      readdirSpy.mockImplementationOnce(() =>
        Promise.resolve([
          { name: 'container1', isDirectory: () => true } as Dirent,
          { name: 'container2', isDirectory: () => true } as Dirent,
        ]),
      );
      const repo = new DiskRepo();
      const accountId = '1001';

      // Act
      const result = await repo.getContainers(accountId);

      // Assert
      expect(result).toEqual([
        {
          name: 'container1',
          orid: `orid:1:test-provider:::1001:fs:container1`,
        },
        {
          name: 'container2',
          orid: `orid:1:test-provider:::1001:fs:container2`,
        },
      ]);
      expect(accessSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${accountId}`,
        fs.constants.F_OK,
      );
      expect(readdirSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${accountId}`,
        { withFileTypes: true },
      );
    });
  });

  describe('getContents', () => {
    it('should return contents of directory', async () => {
      const readdirSpy = jest.spyOn(fs.promises, 'readdir');
      const entries = [
        { name: 'test.txt', isFile: () => true, isDirectory: () => false },
        { name: 'test-dir', isFile: () => false, isDirectory: () => true },
      ];
      readdirSpy.mockResolvedValueOnce(entries as any);
      const repo = new DiskRepo();
      const orid = v1.parse(TEST_ORID_STRING);

      const result = await repo.getContents(orid);

      expect(result).toEqual({
        files: [
          {
            name: 'test.txt',
            orid: 'orid:1:test-provider:::1001:fs:test-resource/test.txt',
          },
        ],
        directories: [
          {
            name: 'test-dir',
            orid: 'orid:1:test-provider:::1001:fs:test-resource/test-dir',
          },
        ],
      });
      expect(readdirSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}`,
        { withFileTypes: true },
      );
    });

    it('should return contents of nested directory', async () => {
      const readdirSpy = jest.spyOn(fs.promises, 'readdir');
      const entries = [
        { name: 'test.txt', isFile: () => true, isDirectory: () => false },
        { name: 'test-dir', isFile: () => false, isDirectory: () => true },
      ];
      readdirSpy.mockResolvedValueOnce(entries as any);
      const repo = new DiskRepo();
      const orid = v1.parse(`${TEST_ORID_STRING}/nested`);

      const result = await repo.getContents(orid);

      expect(result).toEqual({
        files: [
          {
            name: 'test.txt',
            orid: 'orid:1:test-provider:::1001:fs:test-resource/nested/test.txt',
          },
        ],
        directories: [
          {
            name: 'test-dir',
            orid: 'orid:1:test-provider:::1001:fs:test-resource/nested/test-dir',
          },
        ],
      });
      expect(readdirSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}/nested`,
        { withFileTypes: true },
      );
    });

    it('should throw error if directory does not exist', async () => {
      const readdirSpy = jest.spyOn(fs.promises, 'readdir');
      readdirSpy.mockImplementationOnce(() =>
        Promise.reject(new Error('Directory does not exist')),
      );
      const repo = new DiskRepo();
      const orid = v1.parse(TEST_ORID_STRING);

      await expect(repo.getContents(orid)).rejects.toThrow(
        'resource not found',
      );
      expect(readdirSpy).toHaveBeenCalledWith(
        `${TEST_UPLOAD_DIR}/${TEST_ACCOUNT}/${TEST_RESOURCE}`,
        { withFileTypes: true },
      );
    });
  });
});
