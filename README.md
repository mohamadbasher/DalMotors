# AutoHub — car marketplace app

**A vehicle marketplace app for iOS and Android, built for the Israeli market.** Private sellers and dealers list cars, buyers search, filter and get alerts, and dealers run their own storefront with short video clips. Hebrew-first, with Arabic and Russian.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

> The repo is named `DalMotors`; the app is currently branded **AutoHub** pending a final name.

**Status:** feature-complete, being prepared for an iOS TestFlight build.

## Features

- **License-plate auto-fill.** When selling a car, type the plate number and the app fills in the
  manufacturer, model, year, colour, fuel type and test expiry from Israel's open government
  vehicle registry (data.gov.il).
- **Search that fits how people shop:** filters for price, year, gearbox, fuel, area and city,
  32 real manufacturer logos, ownership history and accident fields, and an "average price for
  similar cars" hint.
- **Saved searches with instant alerts:** save a filter and get a push notification the moment a
  matching car is posted.
- **Dealer storefronts:** each dealer gets a store page with in-store search, ratings and reviews,
  a verified badge, "near me" distance sorting and a map view.
- **Short-video feed:** a vertical 60-second video feed for dealers, with likes and a linked car card.
- **Three account modes in one app:** everyone starts as a customer, can open a store in one
  action, and switches between personal and store mode with one tap. Admins get a third mode.
- **Admin tools:** user management (ban, promote, password reset), listing, store and video
  moderation, city and brand management, and featuring or bumping listings.
- **Three languages:** Hebrew (default), Arabic and Russian, with right-to-left layout.

## Engineering highlights

- **Push notifications with zero custom servers.** Postgres itself calls the Expo Push API through
  the `pg_net` extension when a matching car is posted, so saved-search alerts need no backend
  service to run or pay for.
- **Least-privilege by design.** The app only ever uses Supabase's public anon key, with row-level
  security protecting the data. The single privileged operation, an admin-assisted password reset,
  lives in one Edge Function that verifies the caller is an admin.
- **Phone-number login without SMS costs.** Users sign in with a phone number and password,
  mapped to Supabase email auth under the hood, so the app needs no SMS provider.
- **A live government API integration** for vehicle lookups. Registry values are mapped onto the
  app's own brand catalogue and fuel types, and cars the registry doesn't cover (private imports,
  very old vehicles) fall back cleanly to manual entry.

## Tech stack

| Layer | Technology |
|---|---|
| App | Expo SDK 54, React Native 0.81, Expo Router, TypeScript |
| Native features | Maps, location, push notifications, video, image picker |
| Backend | Supabase: PostgreSQL with RLS, `pg_net`, Storage, Edge Functions |
| External data | Israel vehicle registry API (data.gov.il) |

## Project structure

```
app/            screens (Expo Router): auth, tabs per account mode, vehicle, store, admin
components/     shared UI: cards, pickers, star rating, top bar
context/        auth session, profile, store and account-mode state
lib/            Supabase client, i18n, theme, RTL helpers, vehicle registry, notifications
supabase/       schema, city seed (80 Israeli cities), brand seed, Edge Function
```

## Run it locally

You need your own Supabase project. Full setup steps are in
[docs/DEVELOPER-NOTES.md](docs/DEVELOPER-NOTES.md#setup-fresh-supabase-project).

```bash
cp .env.example .env      # add your Supabase URL and anon key
npm install
npx expo start            # scan the QR code with Expo Go
```

---

Built by [Mohamad Basher](https://github.com/mohamadbasher).
