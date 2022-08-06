import { Logic } from '../logic';
import { v1 } from '@maddonkeysoftware/orid-node';
import type { DiskRepo } from '../../interfaces/disk-repo';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { TerraformLockExistsError } from '../../errors/terraform-lock-exists-error';
import { ResourceExistsError } from '../../errors/resource-exists-error';

describe('Logic', () => {
  let logic: Logic;
  let orid: v1.V1Orid;
  const diskRepoMock = {
    doesFileExist: jest.fn(),
    writeFile: jest.fn(),
    delete: jest.fn(),
    readFile: jest.fn(),
    createDirectory: jest.fn(),
    moveFile: jest.fn(),
    getInternalFilePath: jest.fn(),
    getContainers: jest.fn(),
    getContents: jest.fn(),
  };

  beforeEach(() => {
    logic = new Logic({ diskRepo: diskRepoMock as unknown as DiskRepo });
    orid = v1.parse('orid:1:test-provider:::1001:fs:test-resource');
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('createTerraformLock', () => {
    it('creates terraform lock successfully', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(false);

      // Act
      await logic.createTerraformLock(orid);

      // Assert
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(1);
    });

    it('throws error when creating existing terraform lock', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(true);

      // Act
      await expect(logic.createTerraformLock(orid)).rejects.toThrow(
        TerraformLockExistsError,
      );

      // Assert
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(1);
    });
  });

  describe('releaseTerraformLock', () => {
    it('releases terraform lock successfully', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(true);

      // Act
      await logic.releaseTerraformLock(orid);

      // Assert
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(1);
      expect(diskRepoMock.delete).toHaveBeenCalledTimes(1);
    });

    it('throws error when releasing non-existing terraform lock', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(false);

      // Act
      await expect(logic.releaseTerraformLock(orid)).rejects.toThrow(
        ResourceNotFoundError,
      );

      // Assert
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeTerraformMetadata', () => {
    it('removes terraform metadata successfully', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(true);
      diskRepoMock.doesFileExist.mockResolvedValueOnce(true);

      // Act
      await logic.removeTerraformMetadata(orid);

      // Assert
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(2);
      expect(diskRepoMock.delete).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveTerraformState', () => {
    it('saves terraform state successfully with object body', async () => {
      // Arrange
      const body = { key: 'value' };

      // Act
      await logic.saveTerraformState(orid, body);

      // Assert
      expect(diskRepoMock.writeFile).toHaveBeenCalledTimes(1);
    });

    it('saves terraform state successfully with string body', async () => {
      // Arrange
      const body = '{"key":"value"}';

      // Act
      await logic.saveTerraformState(orid, body);

      // Assert
      expect(diskRepoMock.writeFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTerraformState', () => {
    it('gets terraform state successfully', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(true);
      diskRepoMock.readFile.mockResolvedValueOnce('{"key":"value"}');

      // Act
      const state = await logic.getTerraformState(orid);

      // Assert
      expect(state).toEqual('{"key":"value"}');
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(1);
      expect(diskRepoMock.readFile).toHaveBeenCalledTimes(1);
    });

    it('throws error when getting non-existing terraform state', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(false);

      // Act
      await expect(logic.getTerraformState(orid)).rejects.toThrow(
        ResourceNotFoundError,
      );

      // Assert
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(1);
    });
  });

  describe('createContainerOrDirectory', () => {
    it('creates container or directory successfully', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(false);

      // Act
      await logic.createContainerOrDirectory(orid);

      // Assert
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(1);
      expect(diskRepoMock.createDirectory).toHaveBeenCalledTimes(1);
    });

    it('throws error when creating existing container or directory', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(true);

      // Act
      await expect(logic.createContainerOrDirectory(orid)).rejects.toThrow(
        ResourceExistsError,
      );

      // Assert
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveFile', () => {
    it('saves top level file successfully', async () => {
      // Arrange
      const fileName = 'test-file';
      const file = 'test-file-content';

      // Act
      const outOrid = await logic.saveFile(orid, fileName, file);

      // Assert
      expect(diskRepoMock.moveFile).toHaveBeenCalledTimes(1);
      expect(outOrid).toEqual(
        v1.parse('orid:1:test-provider:::1001:fs:test-resource/test-file'),
      );
    });

    it('saves nested file successfully', async () => {
      // Arrange
      const fileName = 'test-file';
      const file = 'test-file-content';
      const orid = v1.parse(
        'orid:1:test-provider:::1001:fs:test-resource/test-container',
      );

      // Act
      const outOrid = await logic.saveFile(orid, fileName, file);

      // Assert
      expect(diskRepoMock.moveFile).toHaveBeenCalledTimes(1);
      expect(outOrid).toEqual(
        v1.parse(
          'orid:1:test-provider:::1001:fs:test-resource/test-container/test-file',
        ),
      );
    });
  });

  describe('deleteFileOrDirectory', () => {
    it('deletes file or directory successfully', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(true);

      // Act
      await logic.deleteFileOrDirectory(orid);

      // Assert
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(1);
      expect(diskRepoMock.delete).toHaveBeenCalledTimes(1);
    });

    it('throws error when deleting non-existing file or directory', async () => {
      // Arrange
      diskRepoMock.doesFileExist.mockResolvedValueOnce(false);

      // Act
      await expect(logic.deleteFileOrDirectory(orid)).rejects.toThrow(
        ResourceNotFoundError,
      );

      // Assert
      expect(diskRepoMock.doesFileExist).toHaveBeenCalledTimes(1);
    });
  });

  describe('getInternalFilePath', () => {
    it('gets internal file path successfully', async () => {
      // Arrange
      const orid = v1.parse('orid:1:test-provider:::1001:fs:test-resource');
      diskRepoMock.getInternalFilePath.mockReturnValueOnce({
        path: '1001/fs',
        filename: 'test-resource',
      });

      // Act
      const { path, filename } = logic.getInternalFilePath(orid);

      // Assert
      expect(diskRepoMock.getInternalFilePath).toHaveBeenCalledTimes(1);
      expect(path).toEqual('1001/fs');
      expect(filename).toEqual('test-resource');
    });
  });

  describe('getContainers', () => {
    it('gets containers successfully', async () => {
      // Arrange
      const accountId = '1001';
      diskRepoMock.getContainers.mockResolvedValueOnce([
        {
          name: 'test-container',
          orid: 'orid:1:test-provider:::1001:fs:test-container',
        },
      ]);

      // Act
      const containers = await logic.getContainers(accountId);

      // Assert
      expect(diskRepoMock.getContainers).toHaveBeenCalledTimes(1);
      expect(containers).toEqual([
        {
          name: 'test-container',
          orid: 'orid:1:test-provider:::1001:fs:test-container',
        },
      ]);
    });
  });

  describe('getContents', () => {
    it('gets contents successfully', async () => {
      // Arrange
      const orid = v1.parse('orid:1:test-provider:::1001:fs:test-container');
      diskRepoMock.getContents.mockResolvedValueOnce({
        directories: [],
        files: [
          {
            name: 'test-file',
            orid: 'orid:1:test-provider:::1001:fs:test-container/test-file',
          },
        ],
      });

      // Act
      const containers = await logic.getContents(orid);

      // Assert
      expect(diskRepoMock.getContents).toHaveBeenCalledTimes(1);
      expect(containers).toEqual({
        directories: [],
        files: [
          {
            name: 'test-file',
            orid: 'orid:1:test-provider:::1001:fs:test-container/test-file',
          },
        ],
      });
    });
  });
});
