# Worko Mobile Design System

Tokens and reusable primitives for the Worko React Native app. Wrap the application with `ThemeProvider`, then use `useWorkoTheme` and the exported components. Light mode is the default; pass `initialMode="dark"` to initialize dark mode. Persisting a user's preference belongs in the app settings layer.

Components provide accessible labels/roles, busy/disabled states, live validation messaging, and a minimum 48dp button/input target. Use token values rather than screen-specific hardcoded design values. Motion should remain restrained and honor system reduced-motion settings.
