import config from 'config';
import { constants as fsConstants } from 'fs';
import {
  access,
  writeFile,
  readFile,
  mkdir,
  copyFile,
  readdir,
} from 'fs/promises';
import type { Dirent } from 'fs';
import { join, basename, dirname } from 'path';
import { v1 } from '@maddonkeysoftware/orid-node';
import del from 'del';
import type {
  DiskRepo as IDiskRepo,
  FileData,
} from '../../core/interfaces/disk-repo';
import { ResourceNotFoundError } from '../../core/errors/resource-not-found-error';

export class DiskRepo implements IDiskRepo {
  #computeDiskPath(orid: v1.V1Orid) {
    const { resourceId, resourceRider, custom3: accountId } = orid;
    const parts = [
      join(config.get<string>('uploadFolder'), accountId as string),
    ];

    if (resourceId) {
      parts.push(resourceId);
    }

    if (resourceRider) {
      parts.push(resourceRider);
    }

    return {
      path: join(...parts),
      read: true,
      delete: true,
      writeNested: true,
      deleteNested: true,
      extensionWhitelist: [],
      extensionBlacklist: [],
    };
  }

  async #fileExists(path: string): Promise<boolean> {
    try {
      await access(path, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async doesFileExist(orid: v1.V1Orid): Promise<boolean> {
    const path = this.#computeDiskPath(orid);
    return this.#fileExists(path.path);
  }

  async writeFile(orid: v1.V1Orid, data: FileData): Promise<void> {
    await writeFile(this.#computeDiskPath(orid).path, data);
  }

  async delete(orid: v1.V1Orid): Promise<void> {
    await del(this.#computeDiskPath(orid).path, { force: true });
  }

  async readFile(orid: v1.V1Orid): Promise<Buffer> {
    return readFile(this.#computeDiskPath(orid).path);
  }

  async createDirectory(orid: v1.V1Orid): Promise<void> {
    const path = this.#computeDiskPath(orid);
    await mkdir(path.path, { recursive: true });
  }

  async moveFile(orid: v1.V1Orid, file: string): Promise<void> {
    const path = this.#computeDiskPath(orid);
    await copyFile(file, path.path);
  }

  getInternalFilePath(orid: v1.V1Orid) {
    const path = this.#computeDiskPath(orid);
    return {
      path: dirname(path.path),
      filename: basename(path.path),
    };
  }

  async getContainers(
    accountId: string,
  ): Promise<{ name: string; orid: string }[]> {
    const oridProviderKey = config.get<string>('oridProviderKey');
    const path = this.#computeDiskPath({
      provider: oridProviderKey,
      service: 'fs',
      resourceId: '',
      custom3: accountId,
    });

    if (!(await this.#fileExists(path.path))) {
      return [];
    }

    const contents = await readdir(path.path, { withFileTypes: true });
    return contents
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        orid: v1.generate({
          provider: oridProviderKey,
          service: 'fs',
          resourceId: entry.name,
          custom3: accountId,
        }),
      }));
  }

  async getContents(orid: v1.V1Orid) {
    const path = this.#computeDiskPath(orid);
    let contents: Dirent[];
    try {
      contents = await readdir(path.path, { withFileTypes: true });
    } catch (err) {
      throw new ResourceNotFoundError();
    }
    const files = contents
      .filter((entry) => entry.isFile())
      .map((entry) => ({
        name: entry.name,
        orid: v1.generate({
          ...orid,
          resourceRider: orid.resourceRider
            ? join(orid.resourceRider, entry.name)
            : entry.name,
          useSlashSeparator: true,
        }),
      }));
    const directories = contents
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        orid: v1.generate({
          ...orid,
          resourceRider: orid.resourceRider
            ? join(orid.resourceRider, entry.name)
            : entry.name,
          useSlashSeparator: true,
        }),
      }));

    return { files, directories };
  }
}
