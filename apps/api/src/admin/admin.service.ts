import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus, WorkerVerificationStatus, ReelModerationStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(actorId:string, action:string, entityType:string, entityId?:string, metadata?:unknown){
    await this.prisma.auditLog.create({data:{actorId,action,entityType,entityId,metadata:metadata as any}});
  }

  async dashboard(){
    const [users,workersPending,requirements,bookings,heldPayments,openDisputes,openSafety,pendingReels] = await Promise.all([
      this.prisma.user.groupBy({by:['status'],_count:{_all:true}}),
      this.prisma.workerProfile.count({where:{verificationStatus:WorkerVerificationStatus.PENDING}}),
      this.prisma.requirement.count({where:{status:{in:['OPEN','MATCHING']}}}),
      this.prisma.booking.count({where:{status:{in:['CONFIRMED','IN_PROGRESS']}}}),
      this.prisma.bookingPayment.aggregate({where:{status:'HELD'},_sum:{grossAmount:true}}),
      this.prisma.dispute.count({where:{status:'OPEN'}}),
      this.prisma.safetyAlert.count({where:{status:'OPEN'}}),
      this.prisma.reel.count({where:{moderationStatus:ReelModerationStatus.PENDING}}),
    ]);
    return {data:{users,workersPending,activeRequirements:requirements,activeBookings:bookings,heldPayments:heldPayments._sum.grossAmount??0,openDisputes,openSafetyAlerts:openSafety,pendingReels}};
  }

  async users(search?:string,status?:UserStatus,role?:UserRole){
    return {data:await this.prisma.user.findMany({where:{status,role,OR:search?[{email:{contains:search,mode:'insensitive'}},{phone:{contains:search}},{id:search}]:undefined},orderBy:{createdAt:'desc'},take:100,select:{id:true,email:true,phone:true,role:true,status:true,createdAt:true,updatedAt:true}})};
  }
  async setUserStatus(actorId:string,id:string,status:UserStatus){
    const user=await this.prisma.user.update({where:{id},data:{status,deactivatedAt:status==='SUSPENDED'?new Date():status==='ACTIVE'?null:undefined},select:{id:true,status:true}});
    await this.audit(actorId,'USER_STATUS_CHANGED','USER',id,{status}); return {data:user};
  }
  async verification(status:WorkerVerificationStatus=WorkerVerificationStatus.PENDING){
    return {data:await this.prisma.workerProfile.findMany({where:{verificationStatus:status},orderBy:{updatedAt:'asc'},take:100,select:{id:true,userId:true,verificationStatus:true,displayName:true,photoUrl:true,user:{select:{email:true,phone:true,createdAt:true}}}})};
  }
  async setVerification(actorId:string,workerId:string,status:WorkerVerificationStatus){
    const worker=await this.prisma.workerProfile.update({where:{id:workerId},data:{verificationStatus:status},select:{id:true,userId:true,verificationStatus:true}});
    await this.audit(actorId,'WORKER_VERIFICATION_CHANGED','WORKER',workerId,{status}); return {data:worker};
  }
  async matching(){return {data:await this.prisma.matchingRound.findMany({orderBy:{startedAt:'desc'},take:100,include:{requirement:{select:{id:true,title:true,status:true}},offers:{select:{id:true,status:true,workerId:true}}}})};}
  async bookings(){return {data:await this.prisma.booking.findMany({orderBy:{createdAt:'desc'},take:100,include:{requirement:{select:{id:true,title:true,status:true}},client:{select:{id:true,email:true,phone:true}},worker:{select:{id:true,userId:true,displayName:true}}}})};}
  async payments(){return {data:await this.prisma.bookingPayment.findMany({orderBy:{createdAt:'desc'},take:100,include:{booking:{select:{id:true,status:true}}}})};}
  async disputes(){return {data:await this.prisma.dispute.findMany({orderBy:{createdAt:'desc'},take:100,include:{reporter:{select:{id:true,email:true,phone:true}},booking:{select:{id:true,status:true}}}})};}
  async resolveDispute(actorId:string,id:string,status:string,resolution?:string){
    const d=await this.prisma.dispute.update({where:{id},data:{status},select:{id:true,status:true}});
    await this.audit(actorId,'DISPUTE_STATUS_CHANGED','DISPUTE',id,{status,resolution}); return {data:d};
  }
  async safety(){return {data:await this.prisma.safetyAlert.findMany({orderBy:{createdAt:'desc'},take:100,include:{reporter:{select:{id:true,email:true,phone:true}},booking:{select:{id:true,status:true}}}})};}
  async resolveSafety(actorId:string,id:string,status:string){const a=await this.prisma.safetyAlert.update({where:{id},data:{status,resolvedAt:status==='RESOLVED'?new Date():null}});await this.audit(actorId,'SAFETY_ALERT_STATUS_CHANGED','SAFETY_ALERT',id,{status});return {data:a};}
  async reels(status:ReelModerationStatus=ReelModerationStatus.PENDING){return {data:await this.prisma.reel.findMany({where:{moderationStatus:status},orderBy:{createdAt:'asc'},take:100,include:{creator:{select:{id:true,email:true,workerProfile:{select:{displayName:true,verificationStatus:true}}}}}})};}
  async moderateReel(actorId:string,id:string,status:ReelModerationStatus){const reel=await this.prisma.reel.update({where:{id},data:{moderationStatus:status,publishedAt:status===ReelModerationStatus.APPROVED?new Date():undefined}});await this.audit(actorId,'REEL_MODERATION_CHANGED','REEL',id,{status});return {data:reel};}
  async challenges(){return {data:await this.prisma.challenge.findMany({orderBy:{createdAt:'desc'},take:100})};}
  async upsertChallenge(actorId:string,id:string|undefined,payload:any){const data={title:String(payload.title),description:String(payload.description),rewardPoints:Number(payload.rewardPoints??0),status:String(payload.status??'DRAFT'),startsAt:payload.startsAt?new Date(payload.startsAt):null,endsAt:payload.endsAt?new Date(payload.endsAt):null,createdById:actorId};const challenge=id?await this.prisma.challenge.update({where:{id},data}):await this.prisma.challenge.create({data});await this.audit(actorId,id?'CHALLENGE_UPDATED':'CHALLENGE_CREATED','CHALLENGE',challenge.id);return {data:challenge};}
  async analytics(){const [users,bookings,revenue,reviews,disputes,reels]=await Promise.all([this.prisma.user.count(),this.prisma.booking.count(),this.prisma.bookingPayment.aggregate({_sum:{grossAmount:true,commissionAmount:true}}),this.prisma.review.aggregate({_avg:{rating:true},_count:{_all:true}}),this.prisma.dispute.count(),this.prisma.reel.count()]);return {data:{users,bookings,grossRevenue:revenue._sum.grossAmount??0,platformCommission:revenue._sum.commissionAmount??0,reviews,disputes,reels}};}
  async auditLogs(){return {data:await this.prisma.auditLog.findMany({orderBy:{createdAt:'desc'},take:200,include:{actor:{select:{id:true,email:true,role:true}}}})};}
  async health(){const [users,bookings,notifications,deliveries]=await Promise.all([this.prisma.user.count(),this.prisma.booking.count(),this.prisma.notification.count(),this.prisma.notificationDelivery.count({where:{status:'FAILED'}})]);return {data:{database:'UP',users,bookings,notifications,failedNotificationDeliveries:deliveries,timestamp:new Date().toISOString()}};}
  async config(){return {data:await this.prisma.systemConfig.findMany({orderBy:{key:'asc'}})};}
  async setConfig(actorId:string,key:string,value:unknown,description?:string){const row=await this.prisma.systemConfig.upsert({where:{key},create:{key,value:value as any,description,updatedBy:actorId},update:{value:value as any,description,updatedBy:actorId}});await this.audit(actorId,'SYSTEM_CONFIG_CHANGED','SYSTEM_CONFIG',row.id,{key});return {data:row};}
}
