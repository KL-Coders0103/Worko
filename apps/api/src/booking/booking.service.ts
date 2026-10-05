import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingPaymentStatus, BookingStatus, NotificationType, Prisma, WalletTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const COMMISSION_RATE = 0.15;

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  private async ownedBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, OR: [{ clientId: userId }, { worker: { userId } }] },
      include: {
        requirement: { include: { category: true, payment: true } },
        client: { select: { id: true, email: true, phone: true, clientProfile: true } },
        worker: { include: { user: { select: { id: true, email: true, phone: true } } } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        reviews: true,
        paymentRecord: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    return booking;
  }

  async getBooking(userId: string, bookingId: string) { return { data: this.serialize(await this.ownedBooking(userId, bookingId)) }; }

  async listBookings(userId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { OR: [{ clientId: userId }, { worker: { userId } }] }, orderBy: { createdAt: 'desc' }, take: 100,
      include: { requirement: { include: { category: true, payment: true } }, worker: { include: { user: { select: { email: true, phone: true } } } }, paymentRecord: true, reviews: true },
    });
    return { data: rows.map(row => this.serialize(row)) };
  }

  async cancel(userId: string, bookingId: string, reason?: string) {
    const booking = await this.ownedBooking(userId, bookingId);
    if (booking.status !== BookingStatus.CONFIRMED) throw new ConflictException('Only confirmed bookings can be cancelled from the app.');
    const updated = await this.prisma.$transaction(async tx => {
      const result = await tx.booking.updateMany({ where: { id: bookingId, status: BookingStatus.CONFIRMED }, data: { status: BookingStatus.CANCELLED } });
      if (result.count !== 1) throw new ConflictException('Booking status changed. Refresh and try again.');
      await tx.bookingStatusHistory.create({ data: { bookingId, status: BookingStatus.CANCELLED, note: reason?.slice(0, 500) || 'Cancelled by user.' } });
      await tx.notification.create({ data: { userId: booking.clientId === userId ? booking.worker.userId : booking.clientId, bookingId, type: NotificationType.BOOKING, title: 'Booking cancelled', body: reason?.trim() || 'The booking was cancelled.' } });
      return tx.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { requirement: { include: { category: true, payment: true } }, paymentRecord: true, reviews: true, statusHistory: true, worker: { include: { user: true } } } });
    });
    return { data: this.serialize(updated) };
  }

  async confirmCompletion(clientId: string, bookingId: string) {
    const booking = await this.ownedBooking(clientId, bookingId);
    if (booking.clientId !== clientId) throw new ConflictException('Only the client can confirm completion.');
    if (booking.status !== BookingStatus.COMPLETED) throw new ConflictException('Worker completion is required before client confirmation.');
    const payment = booking.paymentRecord ?? await this.ensureBookingPayment(booking);
    const released = await this.releaseWorkerPayment(bookingId, payment.id, 'booking-release:' + bookingId);
    await this.prisma.notification.create({ data: { userId: booking.worker.userId, bookingId, type: NotificationType.PAYMENT, title: 'Payment released', body: 'Your booking earnings have been credited to your Worko wallet.' } });
    return { data: { bookingId, confirmed: true, payment: released } };
  }

  async rate(userId: string, bookingId: string, rating: number, comment?: string) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new BadRequestException('Rating must be an integer from 1 to 5.');
    const booking = await this.ownedBooking(userId, bookingId);
    if (booking.status !== BookingStatus.COMPLETED) throw new ConflictException('Only completed bookings can be rated.');
    const targetId = booking.clientId === userId ? booking.worker.userId : booking.clientId;
    const review = await this.prisma.review.create({ data: { bookingId, authorId: userId, targetId, rating, comment: comment?.trim().slice(0, 2000) || null } }).catch(() => { throw new ConflictException('You already rated this booking.'); });
    await this.prisma.notification.create({ data: { userId: targetId, bookingId, type: NotificationType.REVIEW, title: 'New review', body: 'You received a ' + rating + '/5 rating.' } });
    return { data: review };
  }

  async getChat(userId: string, bookingId: string) {
    await this.ownedBooking(userId, bookingId);
    return { data: await this.prisma.chatMessage.findMany({ where: { bookingId }, orderBy: { createdAt: 'asc' }, take: 200, include: { sender: { select: { id: true, email: true, phone: true } } } }) };
  }

  async sendChat(userId: string, bookingId: string, content: string, attachmentUrls: string[] = []) {
    await this.ownedBooking(userId, bookingId);
    const text = content?.trim() || '';
    if (!text && attachmentUrls.length === 0) throw new BadRequestException('Message or attachment is required.');
    if (text.length > 4000 || attachmentUrls.length > 10) throw new BadRequestException('Message or attachments exceed the allowed limit.');
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, select: { clientId: true, worker: { select: { userId: true } } } });
    const targetId = booking.clientId === userId ? booking.worker.userId : booking.clientId;
    const message = await this.prisma.$transaction(async tx => {
      const row = await tx.chatMessage.create({ data: { bookingId, senderId: userId, content: text, attachmentUrls } });
      await tx.notification.create({ data: { userId: targetId, bookingId, type: NotificationType.CHAT, title: 'New booking message', body: text ? text.slice(0, 160) : 'You received a new attachment.' } });
      return row;
    });
    return { data: message };
  }

  async notifications(userId: string) { return { data: await this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }) }; }

  async markNotificationRead(userId: string, id: string) { return { data: await this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } }) }; }

  async createDispute(userId: string, bookingId: string, reason: string, description: string) {
    const booking = await this.ownedBooking(userId, bookingId);
    if (booking.status === BookingStatus.CANCELLED) throw new ConflictException('Cancelled bookings cannot be disputed.');
    const dispute = await this.prisma.$transaction(async tx => {
      const row = await tx.dispute.create({ data: { bookingId, reporterId: userId, reason: reason.trim().slice(0, 120), description: description.trim().slice(0, 4000) } });
      await tx.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.DISPUTED } });
      await tx.bookingStatusHistory.create({ data: { bookingId, status: BookingStatus.DISPUTED, note: 'Dispute opened.' } });
      await tx.notification.create({ data: { userId: booking.clientId === userId ? booking.worker.userId : booking.clientId, bookingId, type: NotificationType.DISPUTE, title: 'Booking dispute opened', body: 'A dispute has been opened for this booking.' } });
      return row;
    });
    return { data: dispute };
  }

  async getDisputes(userId: string, bookingId: string) {
    await this.ownedBooking(userId, bookingId);
    return { data: await this.prisma.dispute.findMany({ where: { bookingId }, orderBy: { createdAt: 'desc' } }) };
  }

  async wallet(userId: string) {
    const wallet = await this.prisma.wallet.upsert({ where: { userId }, create: { userId }, update: {}, include: { transactions: { orderBy: { createdAt: 'desc' }, take: 100 } } });
    return { data: { balance: Number(wallet.balance), currency: wallet.currency, transactions: wallet.transactions.map(t => ({ ...t, amount: Number(t.amount), balanceAfter: Number(t.balanceAfter) })) } };
  }

  async ensureBookingPayment(booking: any) {
    const existing = await this.prisma.bookingPayment.findUnique({ where: { bookingId: booking.id } });
    if (existing) return existing;
    const gross = Number(booking.requirement.payment?.amount ?? booking.requirement.budget ?? 0);
    if (!Number.isFinite(gross) || gross <= 0) throw new ConflictException('Booking payment amount is unavailable.');
    const commission = Number((gross * COMMISSION_RATE).toFixed(2));
    return this.prisma.bookingPayment.create({ data: { bookingId: booking.id, grossAmount: gross, commissionRate: 15, commissionAmount: commission, workerAmount: Number((gross - commission).toFixed(2)), status: BookingPaymentStatus.HELD, releaseKey: 'booking-release:' + booking.id } });
  }

  private async releaseWorkerPayment(bookingId: string, paymentId: string, key: string) {
    return this.prisma.$transaction(async tx => {
      const payment = await tx.bookingPayment.findUniqueOrThrow({ where: { id: paymentId } });
      if (payment.status === BookingPaymentStatus.RELEASED) return { ...payment, workerAmount: Number(payment.workerAmount), commissionAmount: Number(payment.commissionAmount) };
      if (payment.releaseKey !== key) throw new ConflictException('Invalid payment release key.');
      const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId }, select: { worker: { select: { userId: true } } } });
      const wallet = await tx.wallet.upsert({ where: { userId: booking.worker.userId }, create: { userId: booking.worker.userId }, update: {} });
      const workerAmount = Number(payment.workerAmount);
      const newBalance = Number(wallet.balance) + workerAmount;
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });
      await tx.walletTransaction.create({ data: { walletId: wallet.id, bookingId, type: WalletTransactionType.CREDIT, amount: workerAmount, balanceAfter: newBalance, description: 'Booking earnings credited after client confirmation.', idempotencyKey: 'credit:' + bookingId } });
      await tx.bookingPayment.update({ where: { id: payment.id }, data: { status: BookingPaymentStatus.RELEASED, releasedAt: new Date() } });
      return { ...payment, status: BookingPaymentStatus.RELEASED, workerAmount, commissionAmount: Number(payment.commissionAmount) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private serialize(row: any) {
    return {
      ...row,
      requirement: row.requirement ? { ...row.requirement, budget: row.requirement.budget == null ? null : Number(row.requirement.budget), payment: row.requirement.payment ? { ...row.requirement.payment, amount: Number(row.requirement.payment.amount) } : null } : row.requirement,
      paymentRecord: row.paymentRecord ? { ...row.paymentRecord, grossAmount: Number(row.paymentRecord.grossAmount), commissionAmount: Number(row.paymentRecord.commissionAmount), workerAmount: Number(row.paymentRecord.workerAmount) } : null,
    };
  }
}
