import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';

@Module({
  imports: [AuthModule],
  controllers: [ReelsController],
  providers: [ReelsService],
})
export class ReelsModule {}
