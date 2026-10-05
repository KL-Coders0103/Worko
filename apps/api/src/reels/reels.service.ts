import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { EngagementType, ReelModerationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReelsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  async listPublished() {
    const reels = await this.prisma.reel.findMany({
      where: { moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 30,
      select: {
        id: true, mediaUrl: true, caption: true, publishedAt: true, categoryId: true, viewCount: true, likeCount: true, shareCount: true,
        creator: { select: { id: true, role: true, workerProfile: { select: { verificationStatus: true } } } },
        engagements: { where: { type: EngagementType.SAVE }, select: { id: true } },
      },
    });
    return { data: reels.map(({ engagements, ...reel }) => ({ ...reel, savedCount: engagements.length })) };
  }

  async creatorProfile(creatorId: string) {
    const creator = await this.prisma.user.findFirst({
      where: { id: creatorId, status: 'ACTIVE', role: 'WORKER' },
      select: {
        id: true,
        clientProfile: { select: { fullName: true } },
        workerProfile: { select: { verificationStatus: true, availabilityStatus: true, categories: { select: { category: { select: { id: true, name: true, slug: true } } } } } },
        reels: { where: { moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } }, orderBy: { publishedAt: 'desc' }, select: { id: true, caption: true, mediaUrl: true, publishedAt: true } },
      },
    });
    if (!creator) throw new NotFoundException('Creator not found');
    return { data: { id: creator.id, displayName: creator.clientProfile?.fullName ?? 'Worko worker', verified: creator.workerProfile?.verificationStatus === 'VERIFIED', availability: creator.workerProfile?.availabilityStatus ?? 'OFFLINE', categories: creator.workerProfile?.categories.map(x => x.category) ?? [], reels: creator.reels } };
  }

  async listComments(reelId: string) {
    const reel = await this.prisma.reel.findFirst({ where: { id: reelId, moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } }, select: { id: true } });
    if (!reel) throw new NotFoundException('Reel not found');
    const comments = await this.prisma.reelComment.findMany({
      where: { reelId }, orderBy: { createdAt: 'asc' }, take: 100,
      select: { id: true, content: true, createdAt: true, user: { select: { id: true, role: true, clientProfile: { select: { fullName: true } } } } },
    });
    return { data: comments.map(c => ({ ...c, author: { id: c.user.id, displayName: c.user.clientProfile?.fullName ?? 'Worko community member', role: c.user.role }, user: undefined })) };
  }

  async addComment(reelId: string, userId: string, content: string) {
    const normalized = content.trim();
    if (!normalized || normalized.length > 1000) throw new BadRequestException('Comment must contain 1–1000 characters');
    const reel = await this.prisma.reel.findFirst({ where: { id: reelId, moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } }, select: { id: true } });
    if (!reel) throw new NotFoundException('Reel not found');
    const comment = await this.prisma.reelComment.create({ data: { reelId, userId, content: normalized }, select: { id: true, content: true, createdAt: true } });
    return { data: comment };
  }

  async report(reelId: string, userId: string) {
    const reel = await this.prisma.reel.findFirst({
      where: { id: reelId, moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } },
      select: { id: true },
    });
    if (!reel) throw new NotFoundException('Reel not found');
    await this.prisma.reelEngagement.upsert({
      where: { reelId_userId_type: { reelId, userId, type: EngagementType.REPORT } },
      create: { reelId, userId, type: EngagementType.REPORT },
      update: {},
    });
    return { reported: true };
  }

  async save(reelId: string, userId: string) {
    const reel = await this.prisma.reel.findFirst({
      where: { id: reelId, moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } },
      select: { id: true },
    });
    if (!reel) throw new NotFoundException('Reel not found');
    await this.prisma.reelEngagement.upsert({
      where: { reelId_userId_type: { reelId, userId, type: EngagementType.SAVE } },
      create: { reelId, userId, type: EngagementType.SAVE },
      update: {},
    });
    return { saved: true };
  }

  async unsave(reelId: string, userId: string) {
    await this.prisma.reelEngagement.deleteMany({
      where: { reelId, userId, type: EngagementType.SAVE },
    });
    return { saved: false };
  }

  async savedByUser(userId: string) {
    const rows = await this.prisma.reelEngagement.findMany({
      where: { userId, type: EngagementType.SAVE, reel: { moderationStatus: ReelModerationStatus.APPROVED, publishedAt: { not: null } } },
      orderBy: { createdAt: 'desc' },
      select: { reel: { select: { id: true, mediaUrl: true, caption: true, publishedAt: true, creator: { select: { id: true, role: true } } } } },
    });
    return { data: rows.map(row => row.reel) };
  }
}

async create(userId:string,file:any,body:any){if(!file)throw new BadRequestException('Video file is required.');const u=await this.prisma.user.findFirst({where:{id:userId,role:'WORKER',status:'ACTIVE'},select:{id:true}});if(!u)throw new BadRequestException('Only active workers can publish reels.');const caption=body.caption?.trim()||null;if(caption&&caption.length>2200)throw new BadRequestException('Caption is too long.');if(body.categoryId){const cat=await this.prisma.category.findFirst({where:{id:body.categoryId,isActive:true},select:{id:true}});if(!cat)throw new BadRequestException('Invalid category.');}const up=await this.storage.uploadReelVideo(userId,file);const reel=await this.prisma.reel.create({data:{creatorId:userId,mediaUrl:up.url,caption,categoryId:body.categoryId||null,durationSeconds:body.durationSeconds?Math.max(0,Number(body.durationSeconds)):null}});return{data:reel};}
async publish(id:string,userId:string){const reel=await this.prisma.reel.findFirst({where:{id,creatorId:userId}});if(!reel)throw new NotFoundException('Reel not found.');if(['REJECTED','REMOVED'].includes(reel.moderationStatus))throw new BadRequestException('This reel cannot be published.');return{data:await this.prisma.reel.update({where:{id},data:{publishedAt:reel.moderationStatus==='APPROVED'?new Date():null}})};}
async myReels(userId:string){return{data:await this.prisma.reel.findMany({where:{creatorId:userId},orderBy:{createdAt:'desc'},take:100,select:{id:true,mediaUrl:true,caption:true,categoryId:true,moderationStatus:true,publishedAt:true,viewCount:true,likeCount:true,shareCount:true,createdAt:true,rejectionReason:true}})};}
async analytics(userId:string){const [s,reels]=await Promise.all([this.prisma.reel.aggregate({where:{creatorId:userId},_sum:{viewCount:true,likeCount:true,shareCount:true},_count:{_all:true}}),this.prisma.reel.findMany({where:{creatorId:userId},orderBy:{createdAt:'desc'},take:100,select:{id:true,caption:true,moderationStatus:true,publishedAt:true,viewCount:true,likeCount:true,shareCount:true}})]);return{data:{totalReels:s._count._all,views:s._sum.viewCount??0,likes:s._sum.likeCount??0,shares:s._sum.shareCount??0,reels}};}
async view(id:string,userId:string){const r=await this.prisma.reel.findFirst({where:{id,moderationStatus:'APPROVED',publishedAt:{not:null}},select:{id:true}});if(!r)throw new NotFoundException('Reel not found.');await this.prisma.reel.update({where:{id},data:{viewCount:{increment:1}}});return{viewed:true};}
