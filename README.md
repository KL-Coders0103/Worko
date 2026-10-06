# Worko 2.0

An on-demand workforce platform with requirement-based worker matching and a separate short-form discovery feed.

## Architecture

- Mobile: React Native + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL + Prisma
- Cache and queues: Redis + BullMQ
- API: REST + Socket.IO
- Shared contracts: TypeScript + Zod

## Project structure

- apps/api: Backend API
- apps/mobile: React Native application
- packages/contracts: Shared API contracts
- packages/validation: Shared validation schemas
- infrastructure: Docker and deployment configuration
- docs: Architecture and implementation documentation

## Business invariants

1. Clients cannot directly book named workers.
2. Requirements require verified payment before matching.
3. Matching uses 5 km, 10 km, and 25 km rounds.
4. A maximum of 20 distinct offers can be issued per requirement.
5. Only one worker can win an assignment.
6. Wallet transactions must be atomic and idempotent.
7. All domain transitions are validated by the backend.

## Development

See the setup instructions in the project documentation.


## Infrastructure setup

Worko now uses Redis for distributed coordination, BullMQ background jobs, Socket.IO multi-instance broadcasting, and Firebase Cloud Messaging for native push notifications.

### Local Redis

Start the infrastructure stack:

```powershell
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Redis is exposed locally on `127.0.0.1:16379`.

### API environment

Copy `apps/api/.env.example` to `apps/api/.env` and configure:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `AUTH_OTP_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- Razorpay credentials when real payments are enabled
- Firebase server credentials when FCM is enabled

### Firebase Android / FCM

The mobile app uses React Native Firebase Messaging. Download the Android Firebase configuration for package `com.worko.app` from the Firebase console and save it locally as:

`apps/mobile/android/app/google-services.json`

The real file is git-ignored. A structure-only template is provided at `apps/mobile/android/app/google-services.json.example`.

For the API, create a Firebase service account with permission to send FCM messages and configure:

```env
FIREBASE_ENABLED=true
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
```

Never put Firebase service-account credentials in the mobile application.

### Install infrastructure dependencies

After pulling these changes, install the new workspace dependencies:

```powershell
npm install
```

Then validate:

```powershell
npm run typecheck
npm test
npm run build -w apps/api
npx tsc --noEmit -p apps/mobile/tsconfig.json
```
