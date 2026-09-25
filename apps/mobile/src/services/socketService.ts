import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';

const SOCKET_URL = ENV.API_BASE_URL; 

class SocketService {
  public socket: Socket | null = null;

  connect(userId: string, role: 'CLIENT' | 'WORKER') {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server:', this.socket?.id);

      this.socket?.emit('register_device', { userId, role });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();