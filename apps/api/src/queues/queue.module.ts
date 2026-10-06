import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { NotificationWorker } from './notification.worker';

@Global()
@Module({
  providers: [QueueService, NotificationWorker],
  exports: [QueueService],
})
export class QueueModule {}
