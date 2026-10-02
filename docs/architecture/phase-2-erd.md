# Phase 2 — Database ERD

```mermaid
erDiagram
  USER ||--o| WORKER_PROFILE : has
  USER ||--o{ REQUIREMENT : creates
  CATEGORY ||--o{ REQUIREMENT : categorizes
  WORKER_PROFILE ||--o{ WORKER_CATEGORY : tagged
  CATEGORY ||--o{ WORKER_CATEGORY : classifies
  REQUIREMENT ||--o{ MATCHING_OFFER : emits
  WORKER_PROFILE ||--o{ MATCHING_OFFER : receives
  REQUIREMENT ||--o| REQUIREMENT_PAYMENT : secured_by
  REQUIREMENT ||--o| BOOKING : results_in
  BOOKING ||--o{ BOOKING_STATUS_HISTORY : tracks
  REQUIREMENT_PAYMENT ||--o{ PAYMENT_TRANSACTION : records
  BOOKING ||--o{ REVIEW : receives
  USER ||--o{ REEL : publishes
  REEL ||--o{ REEL_ENGAGEMENT : gets
```

Relationships preserve payment and booking audit history with restrictive deletes. Matching offers are unique per requirement/worker pair. Payment references and idempotency keys are unique. Client-to-worker assignment occurs only through matching, never direct browsing. Application services must transactionally enforce payment-before-matching, state transitions, actor consistency, and rating range 1–5.