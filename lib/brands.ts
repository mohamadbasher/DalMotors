import { supabase } from './supabase';

export interface Brand {
  id: string;
  name: string; // matches vehicles.make
  logo_url: string | null;
  sort: number;
}

let cache: Brand[] | null = null;

export async function getBrands(force = false): Promise<Brand[]> {
  if (cache && !force) return cache;
  const { data } = await supabase
    .from('brands')
    .select('*')
    .order('sort', { ascending: true });
  cache = (data ?? []) as Brand[];
  return cache;
}

export function invalidateBrands() {
  cache = null;
}
