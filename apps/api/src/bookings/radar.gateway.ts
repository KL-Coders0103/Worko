import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RadarGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private activeWorkers = new Map<string, string>();
  private activeClients = new Map<string, string>();

  private pendingJobs = new Set<string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    for (const [userId, socketId] of this.activeWorkers.entries()) {
      if (socketId === client.id) this.activeWorkers.delete(userId);
    }
    for (const [userId, socketId] of this.activeClients.entries()) {
      if (socketId === client.id) this.activeClients.delete(userId);
    }
  }

  @SubscribeMessage('register_device')
  handleRegisterDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; role: 'CLIENT' | 'WORKER' },
  ) {
    if (payload.role === 'WORKER') {
      this.activeWorkers.set(payload.userId, client.id);
      console.log(`Worker ${payload.userId} is ONLINE`);
    } else {
      this.activeClients.set(payload.userId, client.id);
      console.log(`Client ${payload.userId} is ONLINE`);
    }
    
    return { status: 'registered' };
  }

  @SubscribeMessage('client:broadcast_job')
  handleBroadcastJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { clientId: string; jobId: string; category: string; budget: string; location: string },
  ) {
    console.log(`Broadcasting Job ${payload.jobId} from Client ${payload.clientId}`);
    
    this.pendingJobs.add(payload.jobId);
    this.activeWorkers.forEach((workerSocketId) => {
      // DYNAMIC: Generate a random distance between 0.5 and 5.0 km for each worker
      const dynamicDistance = (Math.random() * 4.5 + 0.5).toFixed(1);

      this.server.to(workerSocketId).emit('worker:receive_ping', {
        jobId: payload.jobId,
        clientId: payload.clientId,
        category: payload.category,
        budget: payload.budget,
        location: payload.location,
        distance: `${dynamicDistance} km`, 
      });
    });

    return { status: 'broadcasting' };
  }

  @SubscribeMessage('worker:accept_job')
  handleAcceptJob(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { jobId: string; workerId: string; workerName: string; rating: string },
  ) {
    if (!this.pendingJobs.has(payload.jobId)) {
      return { status: 'failed', message: 'Job already taken or expired' };
    }

    this.pendingJobs.delete(payload.jobId);
    console.log(`Worker ${payload.workerId} ACCEPTED Job ${payload.jobId}`);

    // DYNAMIC: Generate an ETA between 5 and 15 minutes
    const dynamicEta = Math.floor(Math.random() * 11) + 5;

    this.server.emit('client:job_matched', {
      jobId: payload.jobId,
      workerId: payload.workerId,
      workerName: payload.workerName,
      rating: payload.rating,
      eta: `${dynamicEta} mins`,
      avatar: `https://i.pravatar.cc/300?u=${payload.workerId}`
    });

    return { status: 'success' };
  }
}