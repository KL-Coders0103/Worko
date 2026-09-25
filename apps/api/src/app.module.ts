import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkersModule } from './workers/workers.module';
import { ClientsModule } from './clients/clients.module';
import { CategoriesModule } from './categories/categories.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { BookingsModule } from './bookings/bookings.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PaymentsModule } from './payments/payments.module';
import { WalletModule } from './wallet/wallet.module';
import { ReelsModule } from './reels/reels.module';
import { AdminModule } from './admin/admin.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { RequirementsModule } from './requirements/requirements.module';
import { RadarGateway } from './bookings/radar.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    WorkersModule,
    ClientsModule,
    CategoriesModule,
    DiscoveryModule,
    BookingsModule,
    AttendanceModule,
    PaymentsModule,
    WalletModule,
    ReelsModule,
    AdminModule,
    PrismaModule,
    StorageModule,
    RequirementsModule
  ],
  controllers: [AppController],
  providers: [AppService, RadarGateway],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
