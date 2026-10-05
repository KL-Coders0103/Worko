import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({ imports: [AuthModule, PrismaModule, StorageModule], controllers: [BookingController], providers: [BookingService], exports: [BookingService] })
export class BookingModule {}
