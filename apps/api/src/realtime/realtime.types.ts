export const REALTIME_EVENTS = {
  REQUIREMENT_OFFERED:
    'worker:requirement_offered',
  REQUIREMENT_ACCEPTED:
    'client:requirement_matched',
  REQUIREMENT_REJECTED:
    'client:requirement_offer_rejected',
  REQUIREMENT_CANCELLED:
    'worker:requirement_cancelled',
} as const;
