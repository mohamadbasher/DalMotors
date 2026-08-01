// Seeds the `brands` table: uploads each PNG in assets/brands to the
// 'brands' storage bucket and inserts a matching row with its public URL.
//
// Usage (run once, after schema.sql, against a fresh project):
//   EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... \
//   ADMIN_PHONE=0500000000 ADMIN_PASSWORD=your-admin-password \
//   node supabase/seed-brands.mjs
//
// The signed-in account must already have role='admin' in `profiles`
// (the `brands` table's RLS only allows admins to write to it).

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '..', 'assets', 'brands');

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const PHONE = process.env.ADMIN_PHONE;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!URL || !ANON || !PHONE || !PASSWORD) {
  console.error(
    'Missing env vars. Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, ADMIN_PHONE, ADMIN_PASSWORD'
  );
  process.exit(1);
}

// Maps the PNG filename (from the open car-logos-dataset) to the display
// name stored in the `brands` table and matched by lib/vehicleRegistry.ts.
const NAMES = {
  toyota: 'Toyota', hyundai: 'Hyundai', kia: 'Kia', mazda: 'Mazda', skoda: 'Skoda',
  suzuki: 'Suzuki', tesla: 'Tesla', bmw: 'BMW', 'mercedes-benz': 'Mercedes', audi: 'Audi',
  volkswagen: 'Volkswagen', honda: 'Honda', nissan: 'Nissan', ford: 'Ford',
  chevrolet: 'Chevrolet', peugeot: 'Peugeot', renault: 'Renault', citroen: 'Citroen',
  seat: 'Seat', mitsubishi: 'Mitsubishi', subaru: 'Subaru', volvo: 'Volvo',
  lexus: 'Lexus', opel: 'Opel', fiat: 'Fiat', porsche: 'Porsche', jeep: 'Jeep',
  'land-rover': 'Land Rover', mg: 'MG', byd: 'BYD', chery: 'Chery', dacia: 'Dacia',
};

const email = `${PHONE.replace(/\D/g, '')}@phone.autohub.app`;
const login = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: PASSWORD }),
}).then((r) => r.json());

const jwt = login.access_token;
if (!jwt) {
  console.error('Login failed — check ADMIN_PHONE / ADMIN_PASSWORD.', login);
  process.exit(1);
}
console.log('Signed in as admin ✔');

let sort = 0;
for (const file of readdirSync(DIR)) {
  const slug = file.replace('.png', '');
  const name = NAMES[slug];
  if (!name) continue;

  const buf = readFileSync(join(DIR, file));
  const path = `logos/${slug}.png`;

  const up = await fetch(`${URL}/storage/v1/object/brands/${path}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: buf,
  });
  if (up.status >= 300) {
    console.log(`✗ upload ${slug}:`, await up.text());
    continue;
  }

  const logo_url = `${URL}/storage/v1/object/public/brands/${path}`;
  const ins = await fetch(`${URL}/rest/v1/brands?on_conflict=name`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ name, logo_url, sort: sort++ }),
  });
  if (ins.status >= 300) console.log(`✗ row ${name}:`, await ins.text());
  else console.log(`✔ ${name}`);
}
