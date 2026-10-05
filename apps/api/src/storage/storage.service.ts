import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';

interface UploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}

@Injectable()
export class StorageService {
  private readonly accountId = process.env.R2_ACCOUNT_ID ?? '';
  private readonly accessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
  private readonly secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';
  private readonly bucketName = process.env.R2_BUCKET_NAME ?? '';
  private readonly publicBaseUrl = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
  private readonly endpoint = this.accountId
    ? `https://${this.accountId}.r2.cloudflarestorage.com`
    : '';

  private ensureConfigured(): void {
    if (
      !this.accountId ||
      !this.accessKeyId ||
      !this.secretAccessKey ||
      !this.bucketName ||
      !this.publicBaseUrl
    ) {
      throw new ServiceUnavailableException(
        'Cloud storage is not configured. Set the R2 environment variables before uploading files.',
      );
    }
  }

  async uploadObject(input: UploadObjectInput): Promise<{ key: string; url: string }> {
    this.ensureConfigured();

    if (!input.key || input.key.includes('..') || input.key.startsWith('/')) {
      throw new BadRequestException('Invalid storage object key.');
    }

    const url = `${this.endpoint}/${encodeURIComponent(this.bucketName)}/${input.key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`;
    const bodyHash = createHash('sha256').update(input.body).digest('hex');
    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const dateStamp = amzDate.slice(0, 8);
    const parsed = new URL(url);
    const canonicalUri = parsed.pathname;
    const canonicalQueryString = '';
    const canonicalHeaders =
      `host:${parsed.host}\ncontent-type:${input.contentType}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      bodyHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this.getSignatureKey(this.secretAccessKey, dateStamp, 'auto', 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Host: parsed.host,
        'Content-Type': input.contentType,
        'Content-Length': String(input.body.byteLength),
        'x-amz-content-sha256': bodyHash,
        'x-amz-date': amzDate,
        Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        ...(input.cacheControl ? { 'Cache-Control': input.cacheControl } : {}),
      },
      body: input.body,
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `Cloud storage upload failed (${response.status}).${responseText ? ` ${responseText.slice(0, 300)}` : ''}`,
      );
    }

    return {
      key: input.key,
      url: `${this.publicBaseUrl}/${input.key}`,
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
      cacheControl: 'public, max-age=31536000, immutable',
    });

    return {
      ...uploaded,
      mimeType: file.mimetype,
      size: file.buffer.byteLength,
    };
  }

  async deleteObject(key: string): Promise<void> {
    this.ensureConfigured();

    const url = `${this.endpoint}/${encodeURIComponent(this.bucketName)}/${key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`;
    const bodyHash = createHash('sha256').update('').digest('hex');
    const now = new Date();
    const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const dateStamp = amzDate.slice(0, 8);
    const parsed = new URL(url);
    const canonicalHeaders = `host:${parsed.host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = [
      'DELETE',
      parsed.pathname,
      '',
      canonicalHeaders,
      signedHeaders,
      bodyHash,
    ].join('\n');
    const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');
    const signingKey = this.getSignatureKey(this.secretAccessKey, dateStamp, 'auto', 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Host: parsed.host,
        'x-amz-content-sha256': bodyHash,
        'x-amz-date': amzDate,
        Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException(`Cloud storage delete failed (${response.status}).`);
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

  private getSignatureKey(secret: string, date: string, region: string, service: string): Buffer {
    const kDate = createHmac('sha256', `AWS4${secret}`).update(date).digest();
    const kRegion = createHmac('sha256', kDate).update(region).digest();
    const kService = createHmac('sha256', kRegion).update(service).digest();
    return createHmac('sha256', kService).update('aws4_request').digest();
  }
}
