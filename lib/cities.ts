import { supabase } from './supabase';
import { Lang } from './i18n';

export interface City {
  id: string;
  name_he: string;
  name_ar: string;
  area: string;
  sort: number;
  lat: number | null;
  lng: number | null;
}

export const AREAS = ['צפון', 'חיפה', 'השרון', 'תל אביב', 'מרכז', 'ירושלים', 'שפלה', 'דרום'];

const AREA_AR: Record<string, string> = {
  צפון: 'الشمال',
  חיפה: 'حيفا',
  השרון: 'الشارون',
  'תל אביב': 'تل أبيب',
  מרכז: 'المركز',
  ירושלים: 'القدس',
  שפלה: 'الشفيلة',
  דרום: 'الجنوب',
};

let cache: City[] | null = null;

export async function getCities(force = false): Promise<City[]> {
  if (cache && !force) return cache;
  const { data } = await supabase
    .from('cities')
    .select('*')
    .order('sort', { ascending: true });
  cache = (data ?? []) as City[];
  return cache;
}

export function invalidateCities() {
  cache = null;
}

export function cityLabel(city: City, lang: Lang): string {
  return lang === 'ar' && city.name_ar ? city.name_ar : city.name_he;
}

export function areaLabel(area: string, lang: Lang): string {
  return lang === 'ar' ? (AREA_AR[area] ?? area) : area;
}
