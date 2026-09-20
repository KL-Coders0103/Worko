import { Controller, Get, Version } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  @Version('1')
  health() {
    return {
      status: 'ok',
      service: 'worko-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @Version('1')
  ready() {
    return {
      status: 'ready',
      service: 'worko-api',
      timestamp: new Date().toISOString(),
    };
  }
}