export const REALTIME_EVENTS = {
  REQUIREMENT_OFFERED:
    'worker:requirement_offered',
  REQUIREMENT_ACCEPTED:
    'client:requirement_matched',
  REQUIREMENT_REJECTED:
    'client:requirement_offer_rejected',
  REQUIREMENT_CANCELLED:
    'worker:requirement_cancelled',

  BOOKING_STATUS_CHANGED:
    'booking:status_changed',

  ATTENDANCE_UPDATED:
    'attendance:updated',

  PAYMENT_STATUS_CHANGED:
    'payment:status_changed',
} as const;
