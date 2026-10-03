# Worko navigation foundation

Navigation is organized by application state and user role:

- **Root:** boot/loading, unauthenticated, authenticated.
- **Auth:** welcome, registration, OTP verification, login.
- **Client:** client home and client feature routes.
- **Worker:** worker onboarding and worker feature routes.

Keep route names and parameter types in a single typed route map. Auth state should select the root navigator; do not navigate to protected screens before a valid session exists. Screen transitions should be subtle (roughly 180–260ms), preserve native back behavior, and respect reduced-motion preferences.

The current mobile package does not include a navigation library. This document intentionally records the architecture without introducing an unreviewed dependency or replacing the working Phase 3 page flow. Add the selected navigator as a separately validated integration before migrating screens.
