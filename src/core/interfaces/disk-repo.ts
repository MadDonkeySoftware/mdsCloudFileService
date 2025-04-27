import type { v1 } from '@maddonkeysoftware/orid-node';
import type { Stream } from 'node:stream';

export type FileData =
  | string
  | NodeJS.ArrayBufferView
  | Iterable<string | NodeJS.ArrayBufferView>
  | AsyncIterable<string | NodeJS.ArrayBufferView>
  | Stream;

export type OridListItem = {
  name: string;
  orid: string;
};

export interface DiskRepo {
  doesFileExist(orid: v1.V1Orid): Promise<boolean>;
  writeFile(orid: v1.V1Orid, data: FileData): Promise<void>;
  readFile(orid: v1.V1Orid): Promise<Buffer>;
  moveFile(destinationPath: v1.V1Orid, localPath: string): Promise<void>;
  getInternalFilePath(orid: v1.V1Orid): { path: string; filename: string };

  createDirectory(orid: v1.V1Orid): Promise<void>;
  delete(orid: v1.V1Orid): Promise<void>;

  getContainers(accountId: string): Promise<OridListItem[]>;
  getContents(
    orid: v1.V1Orid,
  ): Promise<{ directories: OridListItem[]; files: OridListItem[] }>;
}
