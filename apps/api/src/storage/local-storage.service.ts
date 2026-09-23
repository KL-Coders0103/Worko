import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { randomUUID } from 'crypto';

import { createReadStream } from 'fs';

import {
  mkdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from 'fs/promises';

import {
  extname,
  join,
} from 'path';

@Injectable()
export class LocalStorageService {
  private readonly rootDirectory = join(
    process.cwd(),
    'storage',
    'private',
  );

  private async ensureRootDirectory() {
    await mkdir(
      this.rootDirectory,
      {
        recursive: true,
      },
    );
  }

  private resolvePath(key: string) {
    const normalizedKey = key
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');

    const filePath = join(
      this.rootDirectory,
      normalizedKey,
    );

    if (
      !filePath.startsWith(
        this.rootDirectory,
      )
    ) {
      throw new InternalServerErrorException(
        'Invalid storage key',
      );
    }

    return filePath;
  }

  async upload(
    buffer: Buffer,
    contentType: string,
    folder: string,
    originalName?: string,
  ) {
    await this.ensureRootDirectory();

    const extension =
      extname(
        originalName ?? '',
      ).toLowerCase();

    const safeExtension =
      /^[.][a-z0-9]{1,10}$/.test(
        extension,
      )
        ? extension
        : '';

    const key =
      `${folder}/${randomUUID()}${safeExtension}`;

    const filePath =
      this.resolvePath(key);

    await mkdir(
      join(
        this.rootDirectory,
        folder,
      ),
      {
        recursive: true,
      },
    );

    await writeFile(
      filePath,
      buffer,
    );

    return {
      key,
      contentType,
    };
  }

  async download(key: string) {
    const filePath =
      this.resolvePath(key);

    try {
      const buffer =
        await readFile(filePath);

      return {
        buffer,
        key,
      };
    } catch {
      throw new NotFoundException(
        'Stored file not found',
      );
    }
  }

  async delete(key: string) {
    const filePath =
      this.resolvePath(key);

    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted.
    }
  }

  async getFileInfo(key: string) {
    const filePath =
      this.resolvePath(key);

    try {
      const fileStats =
        await stat(filePath);

      return {
        size: fileStats.size,
        key,
      };
    } catch {
      throw new NotFoundException(
        'Stored file not found',
      );
    }
  }

  createReadStream(
    key: string,
    start: number,
    end: number,
  ) {
    const filePath =
      this.resolvePath(key);

    return createReadStream(
      filePath,
      {
        start,
        end,
      },
    );
  }
}