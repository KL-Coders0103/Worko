# Worko mobile API development setup

## Supported local development setup

Worko mobile development currently targets a **physical Android device connected to the development PC with ADB reverse**.

- API base URL: `http://127.0.0.1:3000/api/v1`
- NestJS API port: `3000`
- Required forwarding: `adb reverse tcp:3000 tcp:3000`

The URL is centralized in `apps/mobile/src/services/api/client.ts`. Mobile screens must call `apiRequest()` from that module rather than defining their own base URLs.

## Start the app

1. Start the API from the repository root:

   ```powershell
   npm run dev:api
   ```

2. Connect and authorize your Android phone with USB debugging enabled.
3. From the repository root, run:

   ```powershell
   .\scripts\adb-reverse.ps1
   ```

   Or run `adb reverse tcp:3000 tcp:3000` manually.

4. Confirm the API is reachable from the PC:

   ```powershell
   Invoke-RestMethod http://localhost:3000/api/v1/health
   ```

5. Start the mobile app using the repository's normal Android workflow.

If the phone is disconnected or rebooted, run the ADB reverse command again. The forwarding is not a permanent setting.

## Other environments

Do not replace the physical-device URL with the Android-emulator-only `10.0.2.2` address. Emulator, iOS simulator, and production builds require their own explicit configuration. Update the centralized client deliberately when introducing those environments; never add screen-specific API URLs.
