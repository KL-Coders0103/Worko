import {Body,Controller,Get,Param,Patch,Post,Put,Query,UseGuards} from '@nestjs/common';
import {UserRole,UserStatus,WorkerVerificationStatus,ReelModerationStatus} from '@prisma/client';
import {AdminService} from './admin.service';
import {JwtAuthGuard} from '../auth/jwt-auth.guard';
import {Roles} from '../auth/roles.decorator';
import {RolesGuard} from '../auth/roles.guard';
import {CurrentUser} from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard,RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController{
 constructor(private readonly service:AdminService){}
 @Get('dashboard') dashboard(){return this.service.dashboard();}
 @Get('users') users(@Query('search') search?:string,@Query('status') status?:UserStatus,@Query('role') role?:UserRole){return this.service.users(search,status,role);}
 @Patch('users/:id/status') status(@CurrentUser() u:{id:string},@Param('id') id:string,@Body('status') status:UserStatus){return this.service.setUserStatus(u.id,id,status);}
 @Get('verification') verification(@Query('status') status?:WorkerVerificationStatus){return this.service.verification(status);}
 @Patch('verification/:id') verify(@CurrentUser() u:{id:string},@Param('id') id:string,@Body('status') status:WorkerVerificationStatus){return this.service.setVerification(u.id,id,status);}
 @Get('matching') matching(){return this.service.matching();}
 @Get('bookings') bookings(){return this.service.bookings();}
 @Get('payments') payments(){return this.service.payments();}
 @Get('disputes') disputes(){return this.service.disputes();}
 @Patch('disputes/:id') dispute(@CurrentUser() u:{id:string},@Param('id') id:string,@Body() b:{status:string;resolution?:string}){return this.service.resolveDispute(u.id,id,b.status,b.resolution);}
 @Get('safety') safety(){return this.service.safety();}
 @Patch('safety/:id') safetyResolve(@CurrentUser() u:{id:string},@Param('id') id:string,@Body('status') status:string){return this.service.resolveSafety(u.id,id,status);}
 @Get('reels') reels(@Query('status') status?:ReelModerationStatus){return this.service.reels(status);}
 @Patch('reels/:id') reel(@CurrentUser() u:{id:string},@Param('id') id:string,@Body('status') status:ReelModerationStatus){return this.service.moderateReel(u.id,id,status);}
 @Get('challenges') challenges(){return this.service.challenges();}
 @Post('challenges') createChallenge(@CurrentUser() u:{id:string},@Body() b:any){return this.service.upsertChallenge(u.id,undefined,b);}
 @Patch('challenges/:id') updateChallenge(@CurrentUser() u:{id:string},@Param('id') id:string,@Body() b:any){return this.service.upsertChallenge(u.id,id,b);}
 @Get('support') support(){return this.service.support();}
 @Patch('support/:id') supportResolve(@CurrentUser() u:{id:string},@Param('id') id:string,@Body() b:{status:string;resolution?:string}){return this.service.resolveSupport(u.id,id,b.status,b.resolution);}
 @Get('analytics') analytics(){return this.service.analytics();}
 @Get('audit-logs') audit(){return this.service.auditLogs();}
 @Get('health') health(){return this.service.health();}
 @Get('config') config(){return this.service.config();}
 @Put('config/:key') configUpdate(@CurrentUser() u:{id:string},@Param('key') key:string,@Body() b:{value:unknown;description?:string}){return this.service.setConfig(u.id,key,b.value,b.description);}
}
