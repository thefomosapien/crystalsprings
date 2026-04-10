export interface Zone {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

export interface Site {
  id: string;
  zone_id: string;
  name: string;
  type: 'tent' | 'rv' | 'group';
  max_people: number | null;
  max_rv_length_ft: number | null;
  rv_orientation: 'pull-through' | 'back-in' | null;
  hookups: 'none' | 'water' | 'electric_30a' | 'electric_50a' | 'full' | 'full_sewer' | null;
  surface: 'grass' | 'gravel' | 'paved' | 'dirt' | null;
  shade: 'full' | 'partial' | 'none' | null;
  privacy: 'high' | 'medium' | 'low' | null;
  pet_friendly: boolean;
  ada_accessible: boolean;
  fire_ring: boolean;
  picnic_table: boolean;
  river_access: boolean;
  walk_in_only: boolean;
  base_rate: number;
  floor_rate: number;
  ceiling_rate: number;
  svg_x: number | null;
  svg_y: number | null;
  photos: string[];
  notes: string | null;
  active: boolean;
}

export interface SiteTag {
  id: string;
  site_id: string;
  key: string;
  value: string;
}

export interface Season {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  bookings_open: boolean;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  trusted: boolean;
  notes: string | null;
  booking_count: number;
  last_stay: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  season_id: string;
  site_id: string;
  guest_id: string;
  arrival: string;
  departure: string;
  party_size: number | null;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  rate_per_night: number | null;
  total: number | null;
  rv_length_ft: number | null;
  special_requests: string | null;
  internal_notes: string | null;
  urgency_score: number | null;
  approved_at: string | null;
  created_at: string;
}
