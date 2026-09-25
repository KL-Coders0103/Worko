import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { randomBytes } from 'node:crypto';
import { ReadableStream as NodeReadableStream } from 'stream/web';

type CloudinaryResourceType = 'image' | 'video' | 'raw';

type CloudinaryKeyMetadata = {
  folder: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  format?: string;
};

@Injectable()
export class CloudinaryStorageService {
  private readonly configured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName =
      this.configService.get<string>(
        'storage.cloudinaryCloudName',
      );

    const apiKey =
      this.configService.get<string>(
        'storage.cloudinaryApiKey',
      );

    const apiSecret =
      this.configService.get<string>(
        'storage.cloudinaryApiSecret',
      );

    this.configured = Boolean(
      cloudName && apiKey && apiSecret,
    );

    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  private ensureConfigured(): void {
    if (!this.configured) {
      throw new InternalServerErrorException(
        'Cloudinary storage is not configured',
      );
    }
  }

  private buildPublicId(
    folder: string,
    uniqueId: string,
  ): string {
    const normalizedFolder = folder
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');

    return `${normalizedFolder}/${uniqueId}`;
  }

  private encodeKey(metadata: CloudinaryKeyMetadata): string {
    const encoded = Buffer.from(
      JSON.stringify(metadata),
      'utf8',
    ).toString('base64url');

    return `cloudinary/${metadata.folder}/${encoded}`;
  }

  private decodeKey(key: string): CloudinaryKeyMetadata {
    if (!key.startsWith('cloudinary/')) {
      throw new InternalServerErrorException(
        'Invalid Cloudinary storage key',
      );
    }

    const parts = key.split('/');

    const encoded = parts.at(-1);

    if (!encoded) {
      throw new InternalServerErrorException(
        'Invalid Cloudinary storage key',
      );
    }

    try {
      return JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8'),
      ) as CloudinaryKeyMetadata;
    } catch {
      throw new InternalServerErrorException(
        'Invalid Cloudinary storage key',
      );
    }
  }

  private detectResourceType(
    contentType: string,
  ): CloudinaryResourceType {
    const normalized = contentType.toLowerCase();

    if (normalized.startsWith('video/')) {
      return 'video';
    }

    if (normalized.startsWith('image/')) {
      return 'image';
    }

    return 'raw';
  }

  private async uploadBuffer(
    buffer: Buffer,
    contentType: string,
    folder: string,
    originalName?: string,
  ): Promise<{
    key: string;
    contentType: string;
  }> {
    this.ensureConfigured();

    if (!buffer || buffer.length === 0) {
      throw new InternalServerErrorException(
        'Cannot upload an empty file',
      );
    }

    const resourceType = this.detectResourceType(contentType);
    const uniqueId = cryptoRandomId();
    const publicId = this.buildPublicId(folder, uniqueId);

    const uploadResponse =
      await new Promise<UploadApiResponse>(
        (resolve, reject) => {
          const uploadOptions = {
            resource_type: 'auto' as const,
            type: 'authenticated' as const,
            public_id: publicId,
            overwrite: false,
            invalidate: true,
            context: originalName
              ? {
                  original_name: originalName,
                }
              : undefined,
          };

          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error || !result) {
                reject(
                  error ??
                    new Error(
                      'Cloudinary upload failed',
                    ),
                );
                return;
              }
              resolve(result);
            },
          );

          Readable.from(buffer).pipe(uploadStream);
        },
      );

    const key = this.encodeKey({
      folder,
      publicId: uploadResponse.public_id,
      resourceType:
        uploadResponse.resource_type === 'video'
          ? 'video'
          : resourceType,
      format: uploadResponse.format,
    });

    return {
      key,
      contentType,
    };
  }

  async upload(
    buffer: Buffer,
    contentType: string,
    folder: string,
    originalName?: string,
  ) {
    return this.uploadBuffer(
      buffer,
      contentType,
      folder,
      originalName,
    );
  }

  async download(key: string) {
    this.ensureConfigured();

    const metadata = this.decodeKey(key);

    const url =
      cloudinary.url(metadata.publicId, {
        secure: true,
        sign_url: true,
        type: 'authenticated',
        resource_type: metadata.resourceType,
        format: metadata.format,
      });

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundException(
          'Stored file not found',
        );
      }

      throw new InternalServerErrorException(
        'Failed to download stored file',
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    return {
      buffer: Buffer.from(arrayBuffer),
      key,
    };
  }

  async delete(key: string): Promise<void> {
    this.ensureConfigured();

    const metadata = this.decodeKey(key);

    try {
      await cloudinary.uploader.destroy(
        metadata.publicId,
        {
          resource_type:
            metadata.resourceType,
          type: 'authenticated',
          invalidate: true,
        },
      );
    } catch (error) {
      console.error(
        '[CLOUDINARY DELETE ERROR]',
        error,
      );
    }
  }

  async getFileInfo(key: string) {
    this.ensureConfigured();

    const metadata = this.decodeKey(key);

    try {
      const resource =
        await cloudinary.api.resource(
          metadata.publicId,
          {
            resource_type:
              metadata.resourceType,
            type: 'authenticated',
          },
        );

      return {
        size: Number(resource.bytes ?? 0),
        key,
      };
    } catch (error) {
      console.error(
        '[CLOUDINARY RESOURCE ERROR]',
        error,
      );

      throw new NotFoundException(
        'Stored file not found',
      );
    }
  }

  async createReadStream(
    key: string,
    start: number,
    end: number,
  ): Promise<Readable> {
    this.ensureConfigured();

    const metadata = this.decodeKey(key);

    const url =
      cloudinary.url(metadata.publicId, {
        secure: true,
        sign_url: true,
        type: 'authenticated',
        resource_type:
          metadata.resourceType,
        format: metadata.format,
      });

    const response = await fetch(url, {
      headers: {
        Range: `bytes=${start}-${end}`,
      },
    });

    if (!response.ok && response.status !== 206) {
      if (response.status === 404) {
        throw new NotFoundException(
          'Stored file not found',
        );
      }

      throw new InternalServerErrorException(
        'Failed to stream stored file',
      );
    }

    if (!response.body) {
      throw new InternalServerErrorException(
        'Cloudinary returned an empty response',
      );
    }

    return Readable.fromWeb(
      response.body as unknown as NodeReadableStream,
    );
  }
}

function cryptoRandomId(): string {
  return randomBytes(24).toString('base64url');
}
