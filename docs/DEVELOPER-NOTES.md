# AutoHub (DalMotors) — developer notes

> Internal notes for working on this codebase. For the project overview, see the [README](../README.md).

A vehicle marketplace app for **iOS and Android**, built for the Israeli market — Hebrew-first (RTL), with Arabic and Russian also supported. Built with Expo (React Native) + Supabase.

> **Naming note:** the GitHub repo is called `DalMotors`, but the app is still branded **AutoHub** internally (`app.json`, splash screen). A full rename (app name, bundle ID, icons) is pending a final brand decision.

## ⚠️ Important notes — read before you touch anything

- **Expo SDK is pinned to 54**, not the newest. The project was deliberately **downgraded from 57 → 54** because the maintainer's phone runs the Expo Go app from the store, which only supports SDK 54 at the time of writing. If you bump the SDK, you need Expo Go to support it too (or build a custom dev client), or the app simply won't open on a real device.
- **Login is phone number + password, not email.** There is no real email/SMS infrastructure. Under the hood, a phone number is mapped to a synthetic email (`0501234567` → `0501234567@phone.autohub.app`) and normal Supabase email/password auth is used. See `phoneToEmail()` in `context/AuthContext.tsx`. This means:
  - Supabase's built-in "forgot password" email flow **does not work** (there's no real inbox). Password recovery instead goes through an **admin-assisted reset** — see below.
  - If you ever want real SMS OTP login, that requires picking a paid SMS provider (Twilio Verify, an Israeli gateway, etc.) — not wired up.
- **`supabase/schema.sql` is now the actual source of truth (v3)**, rewritten from the live database on 2026-07-14. Earlier versions of this file drifted badly out of sync with what was actually deployed (a real risk if you ever try to rebuild from an old copy) — always trust the file in the repo over memory of what "used to" be there.
- **The `admin-reset-password` Edge Function** (`supabase/functions/admin-reset-password/`) holds the *only* privileged path in this app — it's the one place a service-role key is used, and it never leaves that function. If you redeploy it, double-check `verify_jwt` stays **true** (an earlier draft mistakenly set it to `false`, which the security reviewer caught before it shipped).
- **The free-tier Supabase project pauses itself after ~1 week of inactivity.** When that happens every request fails with a connection timeout and the app looks broken even though nothing changed. Fix: open the Supabase dashboard and hit **Restore** on the project (takes a couple of minutes), or upgrade to Pro so it never sleeps. This already happened once — if the app suddenly can't sign in or load anything after a break, check the project status *before* debugging the code.
- **`.env` is gitignored on purpose** — it holds your live Supabase project URL + anon key. Copy `.env.example` to `.env` and fill in your own project's values. The anon key is meant to be public-safe (it ships inside the compiled app either way), but there's no reason to put it in git history.
- **Demo/test accounts exist in the live database** used during development (see below). If this becomes a real production app, ban or delete them and rotate the admin account before launch.
- **Russian is a supported language, but the layout is still RTL-shaped** for all three languages (Hebrew/Arabic/Russian) — this was a deliberate scope decision, not an oversight. A true left-to-right layout for Russian would mean touching the manual `row-reverse` styling used across nearly every screen; that rewrite was judged too risky to do in a single pass. Russian text displays correctly, just inside the same RTL-oriented container structure.
- **Native forced RTL does not work reliably inside Expo Go.** Don't try `I18nManager.forceRTL(true)` again expecting it to fix layout — it was tried twice this project and reverted both times. The whole app uses a manual RTL approach instead: `lib/rtl.ts` exports `ROW` (= `flexDirection: 'row-reverse'`) and `RTL_TEXT` (= `textAlign: 'right'`), applied by hand throughout. The bottom tab bar achieves RTL ordering by declaring `Tabs.Screen` entries in **reverse order** (the screen meant to appear on the far right is declared first) — `expo-router`/`@react-navigation` always lays out tabs in declaration order, left to right, regardless of the app's RTL state.
- **The Sell screen's license-plate lookup calls a real Israeli government API** (data.gov.il, dataset `053cea08-09bc-40ec-8f7a-156f0677aff3`, no key needed) — it's a live external dependency. If Israel's open-data portal changes its schema or resource ID, `lib/vehicleRegistry.ts` will need updating.
- **Push notifications need zero custom server.** Postgres calls Expo's push API directly via the `pg_net` extension (see `send_push()` in `schema.sql`). If you ever move off Supabase, that logic needs to move somewhere (a small serverless function is the natural replacement).
- **Sharing a vehicle produces a deep link with no web fallback.** `autohub://vehicle/{id}` only opens something if the recipient already has the app installed — there's no landing page yet for people who don't. Worth building before any real marketing push.
- Legal text (`app/legal.tsx` — terms, privacy, about) is **placeholder copy**, clearly marked as such in-app. Replace with real legal text before a public launch.

## Feature overview

| Area | What's there |
|---|---|
| **Accounts** | Phone + password login. Everyone signs up as a customer; opening a store (become a dealer) is one action from the profile. Dealers get a **one-tap switch** between their personal account and their store's dashboard. Admins get a third mode with its own management dashboard. |
| **Vehicles** | Browse, search, filter (price/year/gearbox/fuel/area/city), sort. Real manufacturer logos (32 brands, admin-manageable). **License-plate auto-fill** pulls manufacturer/model/year/color/fuel/test-expiry from Israel's open vehicle registry. Ownership-hand, accident history, and test-expiry fields. View counters, native share, and "average price for similar cars" guidance. |
| **Stores** | Directory + per-store page with in-store search, star ratings & reviews, verified-dealer badge, "near me" distance sort, and a real map view. |
| **Videos** | TikTok-style 60-second vertical feed for dealers, with likes and a linked vehicle card. |
| **Saved searches** | Save a filter combination; get a **push notification** the moment a matching car is posted. |
| **Admin** | Dashboard, user management (ban, promote, **password reset**), listing moderation, store moderation + verification, city management (add/edit/remove, used for search filtering), brand/logo management, video moderation, and the ability to feature/bump any listing. |
| **Languages** | Hebrew (default), Arabic, Russian — see the RTL note above. |
| **Onboarding** | 3-slide intro shown once to first-time (signed-out) users. |

## Project structure

```
app/                    expo-router screens
  (auth)/               sign-in, sign-up, forgot-password
  (tabs)/                mode-gated tabs: personal / store / admin
  vehicle/[id]           vehicle detail
  store/[id]             store detail + reviews
  admin-*.tsx            admin-only pushed screens (cities, brands, videos)
components/             shared UI (cards, pickers, star rating, top bar)
context/AuthContext.tsx  session, profile, store, account-mode state
lib/                    supabase client, i18n, theme, rtl helpers,
                        vehicleRegistry (gov API), location, notifications
supabase/
  schema.sql            full DB schema — run first, in a fresh project
  seed-cities.sql        80 Israeli cities with coordinates — run second
  seed-brands.mjs        uploads real logos + seeds the brands table — run third
  functions/
    admin-reset-password/  the only Edge Function; see notes above
```

## Setup (fresh Supabase project)

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (pick a region close to Israel, e.g. Frankfurt).
2. **Run the schema**: SQL Editor → paste all of `supabase/schema.sql` → Run.
3. **Run migration 002**: SQL Editor → paste all of `supabase/migrations/002_dal_parity.sql` → Run.
4. **Seed cities**: SQL Editor → paste all of `supabase/seed-cities.sql` → Run.
4. **Allow instant sign-in** (no email confirmation, since there's no real email): Authentication → Providers → Email → turn off "Confirm email".
5. **Connect the app**: copy `.env.example` → `.env`, fill in your project's URL + anon key (Settings → API).
6. **Install & run**:
   ```bash
   npm install
   npx expo start
   ```
   Scan the QR with Expo Go (same Wi-Fi network).
7. **Sign up in the app**, then promote yourself to admin via SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = '<digits>@phone.autohub.app');
   ```
8. **Seed brand logos** (needs your new admin account):
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... \
   ADMIN_PHONE=0500000000 ADMIN_PASSWORD=yourpassword \
   node supabase/seed-brands.mjs
   ```
9. **Deploy the Edge Function** (needed for admin-assisted password resets):
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase functions deploy admin-reset-password
   ```

## Demo accounts

The development database has demo accounts for testing. Their credentials are not published here. Remove or ban them before a public launch.

## Publishing to app stores (later)

```bash
npm install -g eas-cli
eas build --platform all
```
Google Play: $25 one-time. Apple Developer: $99/year (required even for TestFlight).
