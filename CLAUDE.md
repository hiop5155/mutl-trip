# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (localhost:5173)
npm run build    # Production bundle → /dist
npm run preview  # Preview built app locally
firebase deploy  # Deploy to Firebase Hosting
```

## Architecture

**Stack:** React 18 + Vite 5, Firebase 10 (Auth + Realtime Database + Hosting)

**Auth flow:**
- Google OAuth only. `ADMIN_EMAILS` array in `App.jsx` controls who can create trips and see all trips.
- Non-admin users can log in; `canAccessTrip()` in `Dashboard.jsx` filters which trips they see based on `allowedEmails`.
- Each trip stores `allowedEmails: { emailKey: email }`. Creator is always included. Guests are added via the Share modal.
- `emailToKey(email)` sanitises email for Firebase keys: lowercase, `.` → `_`, `@` → `-`.

**Data model (Realtime Database):**
```
trips/{tripId}/
  ├── id, name, dateStart, dateEnd, currency, creatorEmail
  ├── allowedEmails/{ emailKey: email }   # access control
  └── memberProfiles/{ emailKey: { uid, email, displayName, photoURL } }

tripData/{tripId}/
  ├── days/[{ id, date, title, color, items/[{ id, text, type, startTime, endTime,
  │          done, mapUrl, notes/[{ id, author, creatorUid, text, time }] }] }]
  ├── sharedNotes/[{ id, text, authorName, creatorUid, time }]
  ├── expenses/[{ id, desc, amount, currency, category, payer, split, time, creatorUid }]
  ├── expCats/[string]
  ├── flights/{ outbound: {}, inbound: {} }
  └── accommodation/{}

userProfiles/{uid}/displayName   # user's custom display name (overrides Google displayName)
```

**Identity system:**
- `computeTravelers(meta)` in `TripPlanner.jsx` derives the travelers list from `allowedEmails + memberProfiles`. Falls back to stored `travelers` array for old trips without `allowedEmails`.
- When a user opens a trip, TripPlanner writes their profile to `memberProfiles` (including `uid`).
- `selfTraveler = currentUser.displayName || currentUser.email`.
- Custom display name is stored at `userProfiles/{uid}/displayName` via App.jsx and passed to all components as `effectiveUser` (plain object overriding `displayName`).
- `uidToName` map (uid → displayName) is computed in TripPlanner from `memberProfiles` and passed to ExpenseTracker and ItemModal so that stored name strings resolve to the current name even after edits.
- A name-sync `useEffect` in TripPlanner updates all records in local state (sharedNotes, expenses, item notes) when `selfTraveler` changes, then persists to Firebase.

**URL hash routing:** `App.jsx` manages `#tripId` in the URL. Navigating to a trip sets the hash; `Dashboard.jsx` reads `initialTripId` prop and auto-selects the trip on load if the user has access.

**Notes model (two separate systems):**
- **Item notes** (`days[].items[].notes[]`): shared — all members see all notes; only the creator can delete (`creatorUid` check).
- **sharedNotes** (`tripData/{tripId}/sharedNotes`): private — each user only sees their own notes filtered by `creatorUid` client-side.

**Expense tracking:** Live exchange rates from exchangerate-api.com. Payer is always the current user (`selfTraveler`). `resolvePayer(e)` in ExpenseTracker resolves stored payer name via `uidToName[e.creatorUid]` to handle name changes. Multi-person settlement uses a greedy minimum-transactions algorithm.

**Real-time sync:** `TripPlanner.jsx` subscribes to both `tripData/{tripId}` (days, expenses, notes, etc.) and `trips/{tripId}` (live trip metadata / memberProfiles). A `lastSavedState` ref prevents feedback loops between local state and `onValue` callbacks.

**i18n:** Custom React Context (`src/lib/I18nContext.jsx`) with embedded `dict` — Traditional Chinese (`zh`) and English (`en`). Use `t(key)` hook. Language + theme persisted to `localStorage`. Theme applied via `document.body.dataset.theme`.

**Key components:**
- `App.jsx` — auth gate, custom display name editing, URL hash routing, `effectiveUser` construction
- `Dashboard.jsx` — trip list CRUD, share modal with copy-link, `canAccessTrip` filter, hash auto-navigate
- `TripPlanner.jsx` — 4-tab UI (Itinerary / Info / Expenses / Notes), `computeTravelers`, `uidToName`, name-sync, memberProfile write
- `ItemModal.jsx` — shared item notes (all see, creator deletes), map link editor
- `ExpenseTracker.jsx` — multi-currency expenses, `resolvePayer`, greedy settlement
- `src/lib/firebase.js` — Firebase init and DB helpers
- `src/lib/consts.js` — `TYPE_CFG` (item types), `TC` (traveler colors), `CURRENCIES`, `DEFAULT_EXP_CATS`
