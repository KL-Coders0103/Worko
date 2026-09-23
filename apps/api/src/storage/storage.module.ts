import { Module } from '@nestjs/common';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { StorageService } from './storage.service';

@Module({
  providers: [
    CloudinaryStorageService,
    StorageService,
  ],
  exports: [
    StorageService,
  ],
})
export class StorageModule {}