# Worko production infrastructure

## Redis

Worko uses Redis for:
- distributed matching-expiry locking
- Socket.IO horizontal scaling through the Redis adapter
- BullMQ notification jobs

Local Docker Redis is exposed at `redis://127.0.0.1:16379`.

Set:
```
REDIS_URL=redis://127.0.0.1:16379
```

## Firebase Cloud Messaging

The API uses Firebase Admin SDK to send push notifications. The Android app uses React Native Firebase Messaging to obtain and refresh FCM device tokens.

### Required Firebase setup

1. Create or open the Worko Firebase project.
2. Add an Android app with package name `com.worko.app`.
3. Download `google-services.json`.
4. Place it at `apps/mobile/android/app/google-services.json`.
5. In Firebase Console, open **Project settings → Service accounts → Firebase Admin SDK**.
6. Generate a new private key and keep the downloaded JSON outside Git.
7. Copy its `project_id`, `client_email`, and `private_key` into the API environment variables below.

```
FIREBASE_ENABLED=true
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Never commit `google-services.json`, a service-account JSON key, or the private key.

### Push flow

1. Authenticated mobile user requests notification permission.
2. React Native Firebase obtains an FCM token.
3. Mobile registers the token at `POST /api/v1/notifications/devices`.
4. API creates a `NotificationDelivery` record and enqueues a BullMQ job in Redis.
5. The notification worker sends the notification through Firebase Cloud Messaging.
6. Successful delivery becomes `DELIVERED`.
7. Transient failures are retried by BullMQ with exponential backoff.
8. Invalid/unregistered FCM tokens are disabled in `PushDevice`.
9. Permanently failed deliveries remain in the database for admin retry handling.

## Local installation

From the repository root:

```powershell
npm install
```

Start infrastructure:

```docker compose -f infrastructure/docker-compose.yml up -d
```

Then start the API:

```npm run dev:api
```

For Android, rebuild the native app after installing Firebase packages:

```cd apps/mobile
npm install
cd ..\..
adb reverse tcp:3000 tcp:3000
npm run android -w apps/mobile
```

A native rebuild is required because Firebase Messaging is a native dependency.
