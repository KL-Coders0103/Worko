import {
  Injectable,
} from '@nestjs/common';

import { LocalStorageService } from './local-storage.service';

@Injectable()
export class StorageService {
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

  async downloadPrivateObject(
    key: string,
  ) {
    return this.localStorage.download(key);
  }

  async deletePrivateObject(
    key: string,
  ) {
    return this.localStorage.delete(key);
  }
}