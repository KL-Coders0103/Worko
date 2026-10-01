import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  private readonly startedAt = new Date();

  getHealth() {
    return {
      status: 'ok',
      service: 'worko-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: this.startedAt.toISOString(),
    };
  }
}