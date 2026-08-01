export type Role = 'customer' | 'dealer' | 'admin';
export type VehicleStatus = 'active' | 'sold' | 'removed';
export type Transmission = 'automatic' | 'manual';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';
export type Condition = 'new' | 'used';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
  is_banned: boolean;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  city: string | null;
  phone: string | null;
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  // joined
  vehicles?: { count: number }[];
}

export interface StoreReview {
  id: string;
  store_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user?: Pick<Profile, 'full_name' | 'avatar_url'> | null;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: Partial<VehicleFilters>;
  created_at: string;
}

export type AccidentStatus = 'none' | 'minor' | 'major';

export interface Vehicle {
  id: string;
  seller_id: string;
  store_id: string | null;
  title: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  fuel_type: FuelType;
  transmission: Transmission;
  condition: Condition;
  color: string | null;
  city: string | null;
  description: string | null;
  phone: string | null;
  photos: string[];
  status: VehicleStatus;
  created_at: string;
  // Israeli-specific fields
  license_plate: string | null;
  ownership_hand: number | null; // 1, 2, 3 (3 = 3rd hand or more)
  test_expiry: string | null; // ISO date
  accident_status: AccidentStatus | null;
  view_count: number;
  is_featured: boolean;
  featured_until: string | null;
  // joined
  store?: Pick<Store, 'id' | 'name'> | null;
  seller?: Pick<Profile, 'full_name' | 'phone'> | null;
}

export interface Video {
  id: string;
  owner_id: string;
  store_id: string;
  vehicle_id: string | null;
  url: string;
  caption: string | null;
  like_count: number;
  created_at: string;
  // joined
  store?: Pick<Store, 'id' | 'name'> | null;
  vehicle?: Pick<Vehicle, 'id' | 'title' | 'price' | 'photos'> | null;
}

export interface Favorite {
  user_id: string;
  vehicle_id: string;
  created_at: string;
  vehicle?: Vehicle;
}

export interface VehicleFilters {
  search: string;
  maxPrice: number | null;
  minYear: number | null;
  transmission: Transmission | null;
  fuelType: FuelType | null;
  area: string | null;
  city: string | null;
  sort: 'newest' | 'price_asc' | 'price_desc';
}

export const DEFAULT_FILTERS: VehicleFilters = {
  search: '',
  maxPrice: null,
  minYear: null,
  transmission: null,
  fuelType: null,
  area: null,
  city: null,
  sort: 'newest',
};
