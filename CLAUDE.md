# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (localhost:5173)
npm run build    # Production bundle → /dist
firebase deploy  # Deploy to Firebase Hosting
```

## Stack

React 18 + Vite 5, Firebase 10 (Auth + Realtime Database + Hosting). No UI library — all styles are inline JSX. i18n via custom Context in `src/lib/I18nContext.jsx` (zh/en), theme via `document.body.dataset.theme`, both persisted to localStorage.

## Data Model

```
trips/{tripId}/          id, name, dateStart, dateEnd, currency, creatorEmail,
                         destination{name,en,country_zh,country_code,lat,lng},
                         allowedEmails/{emailKey}, memberProfiles/{emailKey}
tripData/{tripId}/       days[], sharedNotes[], packingList[], expenses[],
                         expCats[], flights{}, accommodation{}
userProfiles/{uid}/      displayName
presence/{tripId}/{uid}/ name, uid   ← removed via onDisconnect on disconnect/unmount
```

## Key Patterns

**Access control:** `ADMIN_EMAILS` in `App.jsx` gates trip creation. `canAccessTrip()` in `Dashboard.jsx` filters by `allowedEmails`. `emailToKey(email)` sanitises email for Firebase keys.

**Identity:** Custom display name at `userProfiles/{uid}/displayName` passed as `effectiveUser`. `uidToName` map resolves stored name strings after edits. Name-sync `useEffect` in TripPlanner updates sharedNotes/expenses/item-notes when `selfTraveler` changes.

**Sync:** `lastSavedState` ref in TripPlanner prevents Firebase `onValue` → setState → persist feedback loops. `persist()` called automatically via `useEffect` on any state change.

**Privacy:** `sharedNotes` and `packingList` are filtered client-side by `creatorUid === currentUser.uid`.

**Weather:** Past trips → `archive-api.open-meteo.com`; ≤16 days ahead → `api.open-meteo.com/v1/forecast`; further future → skipped.

**Destination:** `DESTINATION_CITIES` (~140 cities) in `consts.js` has Traditional Chinese names + coordinates. Currency auto-derived via `COUNTRY_CURRENCY[country_code]`.

## Key Files

| File | Role |
|---|---|
| `App.jsx` | Auth gate, display name edit, URL hash routing |
| `Dashboard.jsx` | Trip CRUD, CityPicker, status badges, duplicate, share |
| `TripPlanner.jsx` | 6-tab UI, weather, presence, itinMode, drag-reorder |
| `ExpenseTracker.jsx` | Multi-currency, DonutChart SVG, greedy settlement |
| `src/lib/consts.js` | TYPE_CFG, CURRENCIES (39), DESTINATION_CITIES, CAT_COLORS |
