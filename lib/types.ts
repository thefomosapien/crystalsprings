export interface Zone {
  id: string;
  name: string;
  description: string | null;
  map_order: number;
  created_at: string;
}

export interface Site {
  id: string;
  zone_id: string;
  name: string;
  site_type: 'tent' | 'rv' | 'cabin' | 'glamping';
  max_occupancy: number;
  base_price_per_night: number;
  length_ft: number | null;
  width_ft: number | null;
  amp_service: number | null;
  has_water: boolean;
  has_sewer: boolean;
  is_accessible: boolean;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteTag {
  id: string;
  site_id: string;
  tag: string;
}

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  season_type: 'peak' | 'shoulder' | 'off';
  created_at: string;
}

export interface Guest {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  site_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}
