import {api} from '../../services/api';

export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export type CreateBookingPayload = {
  workerId: string;
  categoryId?: string;
  skillId?: string;
  serviceTitle: string;
  serviceDescription?: string;
  scheduledStart: string;
  scheduledEnd: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

export type BookingUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber?: string | null;
};

export type Booking = {
  id: string;

  clientId: string;
  workerId: string;

  status: BookingStatus;

  categoryId: string | null;
  categoryName: string | null;

  skillId: string | null;
  skillName: string | null;

  serviceTitle: string;
  serviceDescription: string | null;

  hourlyRate: string | null;
  dailyRate: string | null;

  scheduledStart: string;
  scheduledEnd: string;

  address: string;
  latitude: string | null;
  longitude: string | null;

  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;

  rejectedAt: string | null;
  rejectionReason: string | null;

  completedAt: string | null;

  createdAt: string;
  updatedAt: string;

  client: {
    id: string;
    user: BookingUser;
  };

  worker: {
    id: string;
    user: BookingUser;
  };
};

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'ONLINE'
  | 'CASH';

export type Payment = {
  id: string;
  bookingId: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: string;
  currency: string;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  gatewaySignature: string | null;
  idempotencyKey: string;
  failureCode: string | null;
  failureMessage: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePaymentPayload = {
  bookingId: string;
  idempotencyKey: string;
};

export async function createBooking(
  payload: CreateBookingPayload,
): Promise<{booking: Booking}> {
  const response =
    await api.post<{booking: Booking}>(
      '/bookings',
      payload,
    );

  return response.data;
}

export async function getMyBookings(): Promise<
  Booking[]
> {
  const response =
    await api.get<Booking[]>('/bookings');

  return response.data;
}

export async function getBooking(
  bookingId: string,
): Promise<Booking> {
  const response =
    await api.get<Booking>(
      `/bookings/${bookingId}`,
    );

  return response.data;
}

export async function acceptBooking(
  bookingId: string,
): Promise<Booking> {
  const response =
    await api.post<Booking>(
      `/bookings/${bookingId}/accept`,
    );

  return response.data;
}

export async function rejectBooking(
  bookingId: string,
  reason?: string,
): Promise<Booking> {
  const response =
    await api.post<Booking>(
      `/bookings/${bookingId}/reject`,
      {
        reason,
      },
    );

  return response.data;
}

export async function cancelBooking(
  bookingId: string,
  reason?: string,
): Promise<Booking> {
  const response =
    await api.post<Booking>(
      `/bookings/${bookingId}/cancel`,
      {
        reason,
      },
    );

  return response.data;
}

export async function startBooking(
  bookingId: string,
): Promise<Booking> {
  const response =
    await api.post<Booking>(
      `/bookings/${bookingId}/start`,
    );

  return response.data;
}

export async function completeBooking(
  bookingId: string,
): Promise<Booking> {
  const response =
    await api.post<Booking>(
      `/bookings/${bookingId}/complete`,
    );

  return response.data;
}

export async function createPayment(
  payload: CreatePaymentPayload,
): Promise<{payment: Payment}> {
  const response =
    await api.post<{payment: Payment}>(
      '/payments',
      payload,
    );

  return response.data;
}

export async function getBookingPayment(
  bookingId: string,
): Promise<{payment: Payment | null}> {
  const response =
    await api.get<{payment: Payment | null}>(
      `/payments/booking/${bookingId}`,
    );

  return response.data;
}

export async function getPayment(
  paymentId: string,
): Promise<{payment: Payment}> {
  const response =
    await api.get<{payment: Payment}>(
      `/payments/${paymentId}`,
    );

  return response.data;
}

export async function cancelPayment(
  paymentId: string,
  reason?: string,
): Promise<{payment: Payment}> {
  const response =
    await api.post<{payment: Payment}>(
      `/payments/${paymentId}/cancel`,
      {
        reason,
      },
    );

  return response.data;
}

export async function simulateDemoPayment(
  paymentId: string,
  success: boolean,
): Promise<{payment: Payment}> {
  const response =
    await api.post<{payment: Payment}>(
      `/payments/${paymentId}/demo/complete`,
      {
        success,
      },
    );

  return response.data;
}