import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { LocalStorageService } from './local-storage.service';

@Injectable()
export class StorageService {
  private static readonly MAX_REEL_SIZE_BYTES = 100 * 1024 * 1024;

  private static readonly ALLOWED_REEL_MIME_TYPES = new Set([
    'video/mp4',
    'video/quicktime',
    'video/webm',
  ]);

  constructor(
    private readonly localStorage: LocalStorageService,
  ) {}

  async uploadPrivateObject(
    buffer: Buffer,
    contentType: string,
    folder: string,
    originalName?: string,
  ) {
    return this.localStorage.upload(
      buffer,
      contentType,
      folder,
      originalName,
    );
  }

  async downloadPrivateObject(key: string) {
    return this.localStorage.download(key);
  }

  async deletePrivateObject(key: string) {
    return this.localStorage.delete(key);
  }

  async uploadReelVideo(
    buffer: Buffer,
    contentType: string,
    originalName?: string,
  ) {
    this.validateReelVideo(buffer, contentType);

    return this.localStorage.upload(
      buffer,
      contentType,
      'reels/videos',
      originalName,
    );
  }

  private validateReelVideo(
    buffer: Buffer,
    contentType: string,
  ): void {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException(
        'Video file is required.',
      );
    }

    if (
      !StorageService.ALLOWED_REEL_MIME_TYPES.has(
        contentType.toLowerCase(),
      )
    ) {
      throw new BadRequestException(
        'Unsupported reel video format. Allowed formats: MP4, MOV and WebM.',
      );
    }

    if (
      buffer.length >
      StorageService.MAX_REEL_SIZE_BYTES
    ) {
      throw new BadRequestException(
        'Reel video must not exceed 100 MB.',
      );
    }
  }

  async getPrivateObjectInfo(key: string) {
  return this.localStorage.getFileInfo(key);
}

createPrivateObjectReadStream(
  key: string,
  start: number,
  end: number,
) {
  return this.localStorage.createReadStream(
    key,
    start,
    end,
  );
}
}