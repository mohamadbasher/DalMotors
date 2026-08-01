// Israel's official open vehicle registry (data.gov.il / Ministry of Transport).
// Public dataset, no API key needed. Covers private + commercial vehicles up to 3.5t.
const RESOURCE_ID = '053cea08-09bc-40ec-8f7a-156f0677aff3';
const API_URL = 'https://data.gov.il/api/3/action/datastore_search';

// Hebrew manufacturer-name fragments → our brand catalogue names, so a looked-up
// vehicle can auto-highlight the matching logo in BrandPicker.
const BRAND_MAP: [string, string][] = [
  ['טויוטה', 'Toyota'],
  ['יונדאי', 'Hyundai'],
  ['קיה', 'Kia'],
  ['מאזדה', 'Mazda'],
  ['שקודה', 'Skoda'],
  ['סוזוקי', 'Suzuki'],
  ['טסלה', 'Tesla'],
  ['ב.מ.וו', 'BMW'],
  ['במוו', 'BMW'],
  ['מרצדס', 'Mercedes'],
  ['אאודי', 'Audi'],
  ['פולקסווגן', 'Volkswagen'],
  ['הונדה', 'Honda'],
  ['ניסאן', 'Nissan'],
  ['פורד', 'Ford'],
  ['שברולט', 'Chevrolet'],
  ["פיג'ו", 'Peugeot'],
  ['פיגו', 'Peugeot'],
  ['רנו', 'Renault'],
  ['סיטרואן', 'Citroen'],
  ['סיאט', 'Seat'],
  ['מיצובישי', 'Mitsubishi'],
  ['סובארו', 'Subaru'],
  ['וולוו', 'Volvo'],
  ['לקסוס', 'Lexus'],
  ['אופל', 'Opel'],
  ['פיאט', 'Fiat'],
  ['פורשה', 'Porsche'],
  ["ג'יפ", 'Jeep'],
  ['לנד רובר', 'Land Rover'],
  ['דאצי', 'Dacia'],
];

const FUEL_MAP: Record<string, string> = {
  בנזין: 'petrol',
  דיזל: 'diesel',
  היברידי: 'hybrid',
  'היברידי (בנזין)': 'hybrid',
  חשמלי: 'electric',
  'חשמל': 'electric',
};

export interface RegistryVehicle {
  make: string | null; // matched to our brand catalogue, else raw Hebrew name
  makeRaw: string;
  model: string;
  year: number;
  color: string;
  fuelType: string | null; // one of our FuelType values, if recognized
  testExpiry: string | null; // ISO date (YYYY-MM-DD)
  ownershipType: string; // "פרטי" / "מסחרי" etc., informational only
}

function matchBrand(rawName: string): string | null {
  const normalized = rawName.replace(/["'׳]/g, '').trim();
  for (const [fragment, brand] of BRAND_MAP) {
    if (normalized.includes(fragment)) return brand;
  }
  return null;
}

/**
 * Look up a vehicle by Israeli license plate number in the government's
 * open registry. Returns null if not found (private import, too old,
 * off-road, or a typo).
 */
export async function lookupByLicensePlate(plate: string): Promise<RegistryVehicle | null> {
  const digits = plate.replace(/\D/g, '');
  if (!digits) return null;

  const url = `${API_URL}?resource_id=${RESOURCE_ID}&filters=${encodeURIComponent(
    JSON.stringify({ mispar_rechev: parseInt(digits, 10) })
  )}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('vehicle-registry-unreachable');
  const json = await res.json();
  const record = json?.result?.records?.[0];
  if (!record) return null;

  return {
    make: matchBrand(record.tozeret_nm ?? ''),
    makeRaw: record.tozeret_nm ?? '',
    model: record.kinuy_mishari ?? '',
    year: record.shnat_yitzur ?? 0,
    color: record.tzeva_rechev?.trim() ?? '',
    fuelType: FUEL_MAP[record.sug_delek_nm?.trim()] ?? null,
    testExpiry: record.tokef_dt ?? null,
    ownershipType: record.baalut ?? '',
  };
}
