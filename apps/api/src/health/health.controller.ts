import { Controller, Get } from '@nestjs/common';


@Controller()
export class HealthController {
    @Get('health')
    health() {
        return {
            status: 'ok',
            service: 'worko-api',
            timestamp: new Date().toISOString() 
        }
    }
    @Get('ready')
    ready() {
        return {
            status: 'ready',
            service: 'worko-api',
            timestamp: new Date().toISOString() 
        }
    }


}
