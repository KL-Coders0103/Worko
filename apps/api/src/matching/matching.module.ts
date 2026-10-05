import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatchingController, WorkerOffersController } from './matching.controller';
import { MatchingGateway } from './matching.gateway';
import { MatchingService } from './matching.service';

@Module({
  imports: [AuthModule],
  controllers: [MatchingController, WorkerOffersController],
  providers: [MatchingGateway, MatchingService],
  exports: [MatchingService, MatchingGateway],
})
export class MatchingModule {}
