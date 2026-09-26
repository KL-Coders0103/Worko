# Worko Mobile

Production React Native application for Worko.

## Foundation

- React Native 0.87.1
- React 19.2.3
- TypeScript
- React Native Community CLI
- Hermes
- New Architecture
- Cross-platform Android + iOS
- Safe-area support

## Development

Node.js 22.13.0+ is required.

From this directory:

```bash
npm install
npm start
npm run android
```

For iOS, run on macOS with Xcode and CocoaPods:

```bash
npm install
cd ios
bundle exec pod install
cd ..
npm run ios
```

Keep business logic outside screens. Platform-specific behavior must live behind shared service interfaces.
