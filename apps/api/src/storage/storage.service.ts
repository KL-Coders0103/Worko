import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

interface UploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}

@Injectable()
export class StorageService {
  private readonly supabaseUrl = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  private readonly serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  private readonly bucketName = process.env.SUPABASE_STORAGE_BUCKET ?? 'worko-media';

  private ensureConfigured(): void {
    if (!this.supabaseUrl || !this.serviceRoleKey || !this.bucketName) {
      throw new ServiceUnavailableException(
        'Supabase Storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET.',
      );
    }
  }

  async uploadObject(input: UploadObjectInput): Promise<{ key: string; url: string }> {
    this.ensureConfigured();

    if (!input.key || input.key.includes('..') || input.key.startsWith('/')) {
      throw new BadRequestException('Invalid storage object key.');
    }

    const url = `${this.supabaseUrl}/storage/v1/object/${encodeURIComponent(this.bucketName)}/${input.key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey,
        'Content-Type': input.contentType,
        'Cache-Control': input.cacheControl ?? 'public, max-age=31536000, immutable',
        'x-upsert': 'false',
      },
      body: input.body,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Supabase Storage upload failed (${response.status}).${responseText ? ` ${responseText.slice(0, 300)}` : ''}`,
      );
    }

    return {
      key: input.key,
      url: `${this.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(this.bucketName)}/${input.key
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')}`,
    };
  }

  async uploadRequirementPhoto(
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<{ key: string; url: string; mimeType: string; size: number }> {
    const extension = this.getExtension(file.originalname, file.mimetype);
    const key = `requirements/${userId}/${randomUUID()}.${extension}`;
    const uploaded = await this.uploadObject({
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    return {
      ...uploaded,
      mimeType: file.mimetype,
      size: file.buffer.byteLength,
    };
  }

  async deleteObject(key: string): Promise<void> {
    this.ensureConfigured();

    if (!key || key.includes('..') || key.startsWith('/')) {
      throw new BadRequestException('Invalid storage object key.');
    }

    const url = `${this.supabaseUrl}/storage/v1/object/${encodeURIComponent(this.bucketName)}/${key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        apikey: this.serviceRoleKey,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException(`Supabase Storage delete failed (${response.status}).`);
    }
  }

  private getExtension(originalName: string, mimeType: string): string {
    const extension = originalName.includes('.')
      ? originalName.slice(originalName.lastIndexOf('.') + 1).toLowerCase()
      : '';
    if (/^[a-z0-9]{1,8}$/.test(extension)) return extension;
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    return 'jpg';
  }
}
