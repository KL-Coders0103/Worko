import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChallengesService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId?: string) {
    const rows = await this.prisma.challenge.findMany({ where: { status: 'PUBLISHED' }, orderBy: { startsAt: 'desc' }, take: 50, include: { _count: { select: { participations: true } }, participations: userId ? { where: { userId }, select: { status: true, reelId: true, pointsAwarded: true } } : false } });
    return { data: rows.map(({ participations, ...c }) => ({ ...c, participantCount: c._count.participations, participation: Array.isArray(participations) ? participations[0] ?? null : null })) };
  }
  async join(challengeId:string,userId:string){const c=await this.prisma.challenge.findUnique({where:{id:challengeId}});if(!c||c.status!=='PUBLISHED')throw new NotFoundException('Challenge not found.');const now=new Date();if(c.startsAt&&c.startsAt>now)throw new BadRequestException('Challenge has not started.');if(c.endsAt&&c.endsAt<now)throw new BadRequestException('Challenge has ended.');const p=await this.prisma.challengeParticipation.upsert({where:{challengeId_userId:{challengeId,userId}},create:{challengeId,userId},update:{}});return {data:p};}
  async leave(challengeId:string,userId:string){await this.prisma.challengeParticipation.deleteMany({where:{challengeId,userId}});return {joined:false};}
  async mine(userId:string){return {data:await this.prisma.challengeParticipation.findMany({where:{userId},orderBy:{createdAt:'desc'},include:{challenge:true}})};}
}
