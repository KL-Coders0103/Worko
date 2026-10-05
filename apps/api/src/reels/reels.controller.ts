import { Body, Controller, Delete, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReelsService } from './reels.service';
@Controller('reels')
export class ReelsController {
 constructor(private readonly reels: ReelsService) {}
 @Get() list(){return this.reels.listPublished();}
 @Get('creators/:id') creatorProfile(@Param('id') id:string){return this.reels.creatorProfile(id);}
 @Get('mine') @UseGuards(JwtAuthGuard) mine(@CurrentUser() u:AuthenticatedUser){return this.reels.myReels(u.id);}
 @Get('analytics') @UseGuards(JwtAuthGuard) analytics(@CurrentUser() u:AuthenticatedUser){return this.reels.analytics(u.id);}
 @Post('upload') @UseGuards(JwtAuthGuard) @UseInterceptors(FileInterceptor('video',{limits:{fileSize:25*1024*1024}})) upload(@CurrentUser() u:AuthenticatedUser,@UploadedFile() file:any,@Body() body:any){return this.reels.create(u.id,file,body);}
 @Post(':id/publish') @UseGuards(JwtAuthGuard) publish(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser){return this.reels.publish(id,u.id);}
 @Post(':id/view') @UseGuards(JwtAuthGuard) view(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser){return this.reels.view(id,u.id);}
 @Get(':id/comments') comments(@Param('id') id:string){return this.reels.listComments(id);}
 @Post(':id/comments') @UseGuards(JwtAuthGuard) addComment(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser,@Body() b:{content?:string}){return this.reels.addComment(id,u.id,typeof b?.content==='string'?b.content:'');}
 @Get('saved') @UseGuards(JwtAuthGuard) saved(@CurrentUser() u:AuthenticatedUser){return this.reels.savedByUser(u.id);}
 @Post(':id/report') @UseGuards(JwtAuthGuard) report(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser){return this.reels.report(id,u.id);}
 @Post(':id/save') @UseGuards(JwtAuthGuard) save(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser){return this.reels.save(id,u.id);}
 @Delete(':id/save') @UseGuards(JwtAuthGuard) unsave(@Param('id') id:string,@CurrentUser() u:AuthenticatedUser){return this.reels.unsave(id,u.id);}
}