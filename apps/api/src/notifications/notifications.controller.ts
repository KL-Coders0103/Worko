import {Body,Controller,Delete,Get,Param,Patch,Post,UseGuards} from '@nestjs/common'; import {CurrentUser} from '../auth/current-user.decorator'; import {JwtAuthGuard} from '../auth/jwt-auth.guard'; import {NotificationsService} from './notifications.service';
@UseGuards(JwtAuthGuard) @Controller()
export class NotificationsController{
constructor(private readonly service:NotificationsService){}
@Get('notifications') list(@CurrentUser() u:{id:string}){return this.service.list(u.id);}
@Patch('notifications/:id/read') read(@CurrentUser() u:{id:string},@Param('id') id:string){return this.service.markRead(u.id,id);}
@Get('notification-preferences') preferences(@CurrentUser() u:{id:string}){return this.service.preferences(u.id);}
@Patch('notification-preferences') update(@CurrentUser() u:{id:string},@Body() b:any){return this.service.updatePreferences(u.id,b);}
@Post('notifications/devices') register(@CurrentUser() u:{id:string},@Body() b:{token:string;platform:string}){return this.service.registerDevice(u.id,b);}
@Delete('notifications/devices') unregister(@CurrentUser() u:{id:string},@Body('token') token:string){return this.service.unregisterDevice(u.id,token);}
@Post('support/tickets') support(@CurrentUser() u:{id:string},@Body() b:any){return this.service.supportCreate(u.id,b);}
@Get('support/tickets') supportMine(@CurrentUser() u:{id:string}){return this.service.supportMine(u.id);}
@Post('account/deactivate') deactivate(@CurrentUser() u:{id:string}){return this.service.deactivate(u.id);}
@Post('account/deletion') deletion(@CurrentUser() u:{id:string}){return this.service.requestDeletion(u.id);}
@Post('account/deletion/cancel') cancel(@CurrentUser() u:{id:string}){return this.service.cancelDeletion(u.id);}
}
