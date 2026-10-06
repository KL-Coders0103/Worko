import { Injectable, Logger } from '@nestjs/common';

/**
 * Deprecated compatibility shell.
 *
 * Notification processing is owned by NotificationQueueProcessor.
 * Keeping this provider out of QueueModule prevents two BullMQ consumers
 * from racing over the same notification job.
 */
@Injectable()
export class NotificationWorker {
  private readonly logger = new Logger(NotificationWorker.name);
}
