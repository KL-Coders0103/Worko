import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseModule } from '../infrastructure/firebase/firebase.module';
import { QueueModule } from '../queues/queue.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationQueueProcessor } from '../queues/notification-queue.processor';

@Module({
  imports: [AuthModule, PrismaModule, FirebaseModule, QueueModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationQueueProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
