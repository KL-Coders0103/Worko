import { Global, Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { AccountRetentionProcessor } from './account-retention.processor';

@Global()
@Module({
  providers: [QueueService, NotificationQueueProcessor, AccountRetentionProcessor],
  exports: [QueueService],
})
export class QueueModule {}
