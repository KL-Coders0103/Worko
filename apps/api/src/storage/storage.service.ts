import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { CloudinaryStorageService } from './cloudinary-storage.service';

@Injectable()
export class StorageService {
  private static readonly MAX_REEL_SIZE_BYTES =
    100 * 1024 * 1024;

  private static readonly ALLOWED_REEL_MIME_TYPES =
    new Set([
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ]);

  constructor(
    private readonly cloudinaryStorage: CloudinaryStorageService,
  ) {}

  async uploadPrivateObject(
    buffer: Buffer,
    contentType: string,
    folder: string,
    originalName?: string,
  ) {
    return this.cloudinaryStorage.upload(
      buffer,
      contentType,
      folder,
      originalName,
    );
  }

  async uploadKycDocument(buffer: Buffer, contentType: string, folder: string, originalName?: string) {
    this.validateKycDocument(buffer, contentType);
    return this.cloudinaryStorage.upload(buffer, contentType, folder, originalName);
  }

  async uploadProfileImage(buffer: Buffer, contentType: string, folder: string, originalName?: string) {
    this.validateImage(buffer, contentType, 5 * 1024 * 1024);
    return this.cloudinaryStorage.upload(buffer, contentType, folder, originalName);
  }

  private validateKycDocument(buffer: Buffer, contentType: string): void {
    const normalized = contentType.toLowerCase();
    if (!buffer?.length || buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('KYC document must be between 1 byte and 5 MB');
    }
    const pdf = normalized === 'application/pdf' && buffer.subarray(0, 5).toString() === '%PDF-';
    const jpeg = normalized === 'image/jpeg' && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    const png = normalized === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!pdf && !jpeg && !png) {
      throw new BadRequestException('KYC document content does not match its declared file type');
    }
  }

  private validateImage(buffer: Buffer, contentType: string, maxSize: number): void {
    const normalized = contentType.toLowerCase();
    if (!buffer?.length || buffer.length > maxSize) {
      throw new BadRequestException('Image is empty or exceeds the allowed size');
    }
    const jpeg = normalized === 'image/jpeg' && buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
    const png = normalized === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = normalized === 'image/webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
    if (!jpeg && !png && !webp) {
      throw new BadRequestException('Image content does not match its declared file type');
    }
  }

  async downloadPrivateObject(key: string) {
    return this.cloudinaryStorage.download(key);
  }

  async deletePrivateObject(
    key: string,
  ) {
    return this.cloudinaryStorage.delete(key);
  }

  async uploadReelVideo(
    buffer: Buffer,
    contentType: string,
    originalName?: string,
  ) {
    this.validateReelVideo(
      buffer,
      contentType,
    );

    return this.cloudinaryStorage.upload(
      buffer,
      contentType,
      'reels/videos',
      originalName,
    );
  }

  async getPrivateObjectInfo(key: string) {
    return this.cloudinaryStorage.getFileInfo(
      key,
    );
  }

  createPrivateObjectReadStream(
    key: string,
    start: number,
    end: number,
  ) {
    return this.cloudinaryStorage.createReadStream(
      key,
      start,
      end,
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
}