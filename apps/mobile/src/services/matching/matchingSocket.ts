import { io, type Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/client';

const MATCHING_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export type MatchingOfferEvent = {
  offerId: string;
  requirementId: string;
  round: number;
  radiusKm: number;
  distanceKm: number;
  expiresAt: string;
};

export type MatchingSocketEvents = {
  connected: (payload: { userId: string }) => void;
  offer: (payload: MatchingOfferEvent) => void;
  offerExpired: (payload: { offerId: string; requirementId: string }) => void;
  offerRejected: (payload: { offerId: string; requirementId: string }) => void;
  offers: (payload: { requirementId: string; round: number; radiusKm: number; count: number; expiresAt: string }) => void;
  round: (payload: unknown) => void;
  completed: (payload: unknown) => void;
  error: (payload: { message: string }) => void;
};

export async function createMatchingSocket(): Promise<Socket | null> {
  const token = await AsyncStorage.getItem('worko.accessToken');
  if (!token) return null;

  return io(`${MATCHING_ORIGIN}/matching`, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 10000,
  });
}

export function subscribeToMatchingSocket(
  socket: Socket,
  handlers: Partial<MatchingSocketEvents>,
): () => void {
  const bindings: Array<[string, (...args: any[]) => void]> = [
    ['matching.connected', handlers.connected],
    ['matching.offer', handlers.offer],
    ['matching.offer.expired', handlers.offerExpired],
    ['matching.offer.rejected', handlers.offerRejected],
    ['matching.offers', handlers.offers],
    ['matching.round', handlers.round],
    ['matching.completed', handlers.completed],
    ['matching.error', handlers.error],
  ];

  for (const [event, handler] of bindings) {
    if (handler) socket.on(event, handler);
  }

  return () => {
    for (const [event, handler] of bindings) {
      if (handler) socket.off(event, handler);
    }
  };
}

export function subscribeToRequirement(socket: Socket, requirementId: string): void {
  socket.emit('subscribe.requirement', { requirementId });
}
