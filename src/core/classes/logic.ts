import { v1 } from '@maddonkeysoftware/orid-node';
import type { DiskRepo } from '../interfaces/disk-repo';
import { TerraformLockExistsError } from '../errors/terraform-lock-exists-error';
import { ResourceNotFoundError } from '../errors/resource-not-found-error';
import { ResourceExistsError } from '../errors/resource-exists-error';
import { join } from 'path';

const STATE_FILE = 'terraform.tfstate';
const LOCK_FILE = 'terraform.lock';

export class Logic {
  #diskRepo: DiskRepo;

  constructor({ diskRepo }: { diskRepo: DiskRepo }) {
    this.#diskRepo = diskRepo;
  }

  async createTerraformLock(orid: v1.V1Orid) {
    const lockFileOrid = v1.parse(
      v1.generate({ ...orid, resourceRider: LOCK_FILE }),
    );
    const exists = await this.#diskRepo.doesFileExist(lockFileOrid);
    if (exists) {
      throw new TerraformLockExistsError();
    }
    await this.#diskRepo.writeFile(lockFileOrid, '');
  }

  async releaseTerraformLock(orid: v1.V1Orid) {
    const lockFileOrid = v1.parse(
      v1.generate({ ...orid, resourceRider: LOCK_FILE }),
    );
    const exists = await this.#diskRepo.doesFileExist(lockFileOrid);
    if (!exists) {
      throw new ResourceNotFoundError();
    }
    await this.#diskRepo.delete(lockFileOrid);
  }

  async removeTerraformMetadata(orid: v1.V1Orid) {
    const stateFileOrid = v1.parse(
      v1.generate({ ...orid, resourceRider: STATE_FILE }),
    );
    const lockFileOrid = v1.parse(
      v1.generate({ ...orid, resourceRider: LOCK_FILE }),
    );

    if (await this.#diskRepo.doesFileExist(stateFileOrid)) {
      await this.#diskRepo.delete(stateFileOrid);
    }
    if (await this.#diskRepo.doesFileExist(lockFileOrid)) {
      await this.#diskRepo.delete(lockFileOrid);
    }
  }

  async saveTerraformState(orid: v1.V1Orid, body: unknown) {
    const stateFileOrid = v1.parse(
      v1.generate({ ...orid, resourceRider: STATE_FILE }),
    );
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    await this.#diskRepo.writeFile(stateFileOrid, payload);
  }

  async getTerraformState(orid: v1.V1Orid) {
    const stateFileOrid = v1.parse(
      v1.generate({ ...orid, resourceRider: STATE_FILE }),
    );
    const exists = await this.#diskRepo.doesFileExist(stateFileOrid);
    if (!exists) {
      throw new ResourceNotFoundError();
    }
    return this.#diskRepo.readFile(stateFileOrid);
  }

  async createContainerOrDirectory(orid: v1.V1Orid) {
    const doesExist = await this.#diskRepo.doesFileExist(orid);
    if (doesExist) {
      throw new ResourceExistsError();
    }

    await this.#diskRepo.createDirectory(orid);
  }

  async saveFile(orid: v1.V1Orid, fileName: string, file: string) {
    const newFileOrid = v1.parse(
      v1.generate({
        ...orid,
        resourceRider: orid.resourceRider
          ? join(orid.resourceRider, fileName)
          : fileName,
        useSlashSeparator: true,
      }),
    );
    await this.#diskRepo.moveFile(newFileOrid, file);
    return newFileOrid;
  }

  async deleteFileOrDirectory(orid: v1.V1Orid) {
    const doesExist = await this.#diskRepo.doesFileExist(orid);
    if (!doesExist) {
      throw new ResourceNotFoundError();
    }

    await this.#diskRepo.delete(orid);
  }

  getInternalFilePath(orid: v1.V1Orid) {
    return this.#diskRepo.getInternalFilePath(orid);
  }

  async getContainers(accountId: string) {
    return this.#diskRepo.getContainers(accountId);
  }

  async getContents(orid: v1.V1Orid) {
    return this.#diskRepo.getContents(orid);
  }
}
