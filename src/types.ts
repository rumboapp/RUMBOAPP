/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum AgencyRole {
  ADMIN = 'admin',
  GUIA = 'guia'
}

export interface Agency {
  id: string;
  owner_id: string;
  name: string;
  join_code: string;
  logo_url: string;
  city: string;
  latitude: number;
  longitude: number;
  subscription_plan?: 'free' | 'premium' | 'pro';
  whatsapp_template?: string;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgencyMember {
  id: string;
  agency_id: string;
  user_id: string;
  role: AgencyRole;
  created_at: string;
}

export interface Activity {
  id: string;
  agency_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  currency: string;
  capacity_max: number;
  meeting_point: string;
  photo_url: string;
  active: boolean;
  whatsapp_template?: string;
  created_at: string;
  updated_at: string;
}

export interface Guide {
  id: string;
  agency_id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  email: string;
  specialties: string[];
  active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Departure {
  id: string;
  agency_id: string;
  activity_id: string;
  guide_id: string | null;
  guide_ids?: string[];
  departure_date: string; // YYYY-MM-DD
  departure_time: string; // HH:MM
  status: 'programada' | 'en_curso' | 'finalizada' | 'cancelada';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Passenger {
  id: string;
  departure_id: string;
  full_name: string;
  phone: string;
  pax_count: number;
  checked_in: boolean;
  notes: string;
  age?: number;
  has_minor?: boolean;
  minor_name?: string;
  minor_age?: number;
  dietary_restrictions?: string;
  medical_issues?: string;
  emergency_phone?: string;
  created_at: string;
  custom_price?: number;
  signed_risk_waiver?: boolean;
  signature_data?: string;
  signed_at?: string;
  is_group_booking?: boolean;
  company_name?: string;
  group_members_text?: string;
  rut_passport?: string;
  nationality?: string;
  emergency_contact_name?: string;
  previous_experience?: boolean;
  previous_experience_detail?: string;
  allergies?: string;
  contraindicated_medications?: string;
  recent_injuries?: string;
  pregnancy?: boolean;
  heart_conditions?: boolean;
  personal_insurance?: string;
}

export interface Notification {
  id: string;
  agency_id: string;
  kind: 'departure_created' | 'system' | 'weather_alert';
  title: string;
  message: string;
  departure_id: string | null;
  read: boolean;
  created_at: string;
}

// Simulated session structure
export interface MockUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface AuthContextType {
  user: MockUser | null;
  agency: Agency | null;
  role: AgencyRole | null;
  isAdmin: boolean;
  loading: boolean;
  isDemoMode: boolean;
  refreshAgency: () => void;
  signOut: () => void;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpAdmin: (email: string, pass: string, name: string, agencyName: string, city: string, logoUrl?: string) => Promise<{ success: boolean; error?: string }>;
  signUpGuide: (email: string, pass: string, name: string, joinCode: string, phone: string, avatarUrl?: string) => Promise<{ success: boolean; error?: string }>;
}
