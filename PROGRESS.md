### Session 23 — 2025-08-14
Phase worked on: PWA setup and Quick Add screen implementation
Completed:
- Installed `next-pwa` and configured it in `next.config.mjs`
- Created `manifest.webmanifest`
- Added `PWARegister` component and enabled service worker
- Implemented `Providers` component with `QueryClientProvider`
- Built `QuickAdd` component for transaction entry
- Replaced placeholder on `/add` route with the `QuickAdd` component
- Integrated account fetching in `QuickAdd`
Broken / TODO:
- Full offline mutation queue with IndexedDB persistence for TanStack Query
- Polish the UI of Quick Add to match "keypad-first" design
Next exact step:
- Implement robust offline persistence for mutations using `react-query-persist-client`
