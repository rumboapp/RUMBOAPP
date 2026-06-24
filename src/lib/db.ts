/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agency, AgencyMember, Activity, Departure, Passenger, Guide, Notification, AgencyRole, MockUser } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getCoordinatesForCity } from './cities';

// localStorage solo como caché offline temporal
const LOCAL_CACHE_KEY = 'rumbo_offline_cache';

export interface DBState {
  users: MockUser[];
  agencies: Agency[];
  agency_members: AgencyMember[];
  activities: Activity[];
  guides: Guide[];
  departures: Departure[];
  passengers: Passenger[];
  notifications: Notification[];
}

// Funciones de caché local (solo para modo offline/visual)
function getLocalCache(): DBState | null {
  try {
    const stored = localStorage.getItem(LOCAL_CACHE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function setLocalCache(state: DBState) {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function dispatchDbUpdate() {
  window.dispatchEvent(new Event('rumbo_db_updated'));
}

// ─── MODO DEMO ───
// Cuando está activo, todas las escrituras a Supabase quedan bloqueadas
// y se notifica vía evento para mostrar un aviso al usuario.
let demoModeActive = false;

export function setDemoMode(active: boolean): void {
  demoModeActive = active;
}

export function isDemoModeActive(): boolean {
  return demoModeActive;
}

function blockIfDemo(): boolean {
  if (demoModeActive) {
    window.dispatchEvent(new Event('rumbo_demo_blocked'));
    return true;
  }
  return false;
}

// Estado en memoria, solo de la sesión, para simular escrituras en modo demo
// sin persistir nada en Supabase. Se descarta al recargar la página.
const demoSessionDepartures: Departure[] = [];
const demoSessionPassengers: Passenger[] = [];
const demoSessionNotifications: Notification[] = [];

// ============================================================
// FUNCIONES DE BASE DE DATOS - SUPABASE FIRST
// ============================================================

export const db = {
  // ─── AGENCIAS ───

  async lookupAgencyByCode(joinCode: string): Promise<Agency | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data } = await supabase
      .from('agencies')
      .select('*')
      .eq('join_code', joinCode.toUpperCase().trim())
      .limit(1)
      .single();
    return data as Agency | null;
  },

  async createAgency(ownerId: string, name: string, city: string, logoUrl?: string): Promise<Agency> {
    const generatedCode = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() + 
                         Math.floor(1000 + Math.random() * 9000);
    const coords = getCoordinatesForCity(city);
    const cleanLogoUrl = logoUrl || 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=150';

    const newAgency: Agency = {
      id: 'agc-' + Math.random().toString(36).substr(2, 9),
      owner_id: ownerId,
      name,
      join_code: generatedCode,
      logo_url: cleanLogoUrl,
      city,
      latitude: coords.latitude,
      longitude: coords.longitude,
      subscription_plan: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('agencies').insert(newAgency);
    }

    return newAgency;
  },

  async updateAgency(agencyId: string, data: Partial<Agency>): Promise<Agency | null> {
    if (blockIfDemo()) return null;
    if (!isSupabaseConfigured || !supabase) return null;

    const updatedCoords = data.city ? getCoordinatesForCity(data.city) : {};
    const updateData = {
      ...data,
      ...updatedCoords,
      updated_at: new Date().toISOString()
    };

    const { data: result } = await supabase
      .from('agencies')
      .update(updateData)
      .eq('id', agencyId)
      .select()
      .single();

    dispatchDbUpdate();
    return result as Agency | null;
  },

  // ─── MIEMBROS / GUÍAS ───

  async joinAgencyAsGuide(args: { 
    joinCode: string; 
    userId: string; 
    email: string; 
    fullName: string; 
    phone: string; 
    avatarUrl?: string 
  }): Promise<{ success: boolean; error?: string; agency?: Agency; member?: AgencyMember; guide?: Guide }> {
    if (blockIfDemo()) return { success: false, error: 'Esto es una demo: los cambios no se guardan.' };
    const agency = await this.lookupAgencyByCode(args.joinCode);
    if (!agency) {
      return { success: false, error: 'Código de agencia inválido.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase no está configurado.' };
    }

    // Verificar si ya es dueño
    const { data: owned } = await supabase
      .from('agencies')
      .select('id')
      .eq('owner_id', args.userId)
      .limit(1);

    if (owned && owned.length > 0) {
      return { success: false, error: 'Ya eres dueño de una agencia.' };
    }

    // Verificar si ya es miembro
    const { data: existingMember } = await supabase
      .from('agency_members')
      .select('*')
      .eq('user_id', args.userId)
      .limit(1);

    if (existingMember && existingMember.length > 0) {
      return { success: false, error: 'Ya estás registrado en otra agencia.' };
    }

    const newMember: AgencyMember = {
      id: 'mem-' + Math.random().toString(36).substr(2, 9),
      agency_id: agency.id,
      user_id: args.userId,
      role: AgencyRole.GUIA,
      created_at: new Date().toISOString()
    };

    const newGuide: Guide = {
      id: 'gd-' + Math.random().toString(36).substr(2, 9),
      agency_id: agency.id,
      user_id: args.userId,
      full_name: args.fullName,
      phone: args.phone || '+56900000000',
      email: args.email,
      specialties: ['Turismo general'],
      active: false,
      avatar_url: args.avatarUrl || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await supabase.from('agency_members').insert(newMember);
    await supabase.from('guides').insert(newGuide);

    // Notificación
    await supabase.from('notifications').insert({
      id: 'not-' + Math.random().toString(36).substr(2, 9),
      agency_id: agency.id,
      kind: 'system',
      title: 'Solicitud de Unión de Guía',
      message: `${args.fullName} se registró y requiere aprobación.`,
      read: false,
      created_at: new Date().toISOString()
    });

    dispatchDbUpdate();
    return { success: true, agency, member: newMember, guide: newGuide };
  },

  // ─── ACTIVIDADES ───

  async getActivities(agencyId: string): Promise<Activity[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    return (data || []) as Activity[];
  },

  async getActivity(id: string): Promise<Activity | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data } = await supabase.from('activities').select('*').eq('id', id).single();
    return data as Activity | null;
  },

  async createActivity(agencyId: string, data: Omit<Activity, 'id' | 'agency_id' | 'created_at' | 'updated_at'>): Promise<Activity> {
    if (blockIfDemo()) {
      return { ...data, id: 'demo-act', agency_id: agencyId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }
    let photo = data.photo_url;
    if (!photo) {
      const keywords = data.name.toLowerCase();
      if (keywords.includes('rafting') || keywords.includes('agua') || keywords.includes('rio')) {
        photo = 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=600';
      } else if (keywords.includes('trekking') || keywords.includes('montaña') || keywords.includes('caminata')) {
        photo = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600';
      } else if (keywords.includes('navegacion') || keywords.includes('barco') || keywords.includes('lago')) {
        photo = 'https://images.unsplash.com/photo-1544411047-c491574abb22?w=600';
      } else {
        photo = 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=600';
      }
    }

    const newActivity: Activity = {
      ...data,
      id: 'act-' + Math.random().toString(36).substr(2, 9),
      agency_id: agencyId,
      photo_url: photo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('activities').insert(newActivity);
    }

    dispatchDbUpdate();
    return newActivity;
  },

  async updateActivity(id: string, data: Partial<Omit<Activity, 'id' | 'agency_id' | 'created_at' | 'updated_at'>>): Promise<Activity | null> {
    if (blockIfDemo()) return null;
    if (!isSupabaseConfigured || !supabase) return null;
    const { data: result } = await supabase
      .from('activities')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    dispatchDbUpdate();
    return result as Activity | null;
  },

  async deleteActivity(id: string): Promise<void> {
    if (blockIfDemo()) return;
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('activities').delete().eq('id', id);
    // También eliminar salidas asociadas
    await supabase.from('departures').delete().eq('activity_id', id);
    dispatchDbUpdate();
  },

  // ─── GUÍAS ───

  async getGuides(agencyId: string): Promise<Guide[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase
      .from('guides')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    return (data || []) as Guide[];
  },

  async createGuide(agencyId: string, data: Omit<Guide, 'id' | 'agency_id' | 'created_at' | 'updated_at'>): Promise<Guide> {
    if (blockIfDemo()) {
      return { ...data, id: 'demo-gd', agency_id: agencyId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }
    const newGuide: Guide = {
      ...data,
      id: 'gd-' + Math.random().toString(36).substr(2, 9),
      agency_id: agencyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('guides').insert(newGuide);
    }

    dispatchDbUpdate();
    return newGuide;
  },

  async updateGuide(id: string, data: Partial<Omit<Guide, 'id' | 'agency_id' | 'created_at' | 'updated_at'>>): Promise<Guide | null> {
    if (blockIfDemo()) return null;
    if (!isSupabaseConfigured || !supabase) return null;
    const { data: result } = await supabase
      .from('guides')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    dispatchDbUpdate();
    return result as Guide | null;
  },

  async deleteGuide(id: string): Promise<void> {
    if (blockIfDemo()) return;
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('guides').delete().eq('id', id);
    // Desasignar de salidas
    await supabase.from('departures').update({ guide_id: null }).eq('guide_id', id);
    dispatchDbUpdate();
  },

  // ─── MIEMBROS ───

  async getMembers(agencyId: string): Promise<{ member: AgencyMember; user: MockUser }[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase
      .from('agency_members')
      .select('*, users(*)')
      .eq('agency_id', agencyId);

    if (!data) return [];

    return data.map((m: any) => ({
      member: m as AgencyMember,
      user: m.users as MockUser
    }));
  },

  async updateMemberRole(memberId: string, role: AgencyRole): Promise<void> {
    if (blockIfDemo()) return;
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('agency_members').update({ role }).eq('id', memberId);
    dispatchDbUpdate();
  },

  async deleteMember(memberId: string): Promise<void> {
    if (blockIfDemo()) return;
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('agency_members').delete().eq('id', memberId);
    dispatchDbUpdate();
  },

  // ─── SALIDAS ───

  async getDepartures(agencyId: string): Promise<Departure[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase
      .from('departures')
      .select('*')
      .eq('agency_id', agencyId)
      .order('departure_date', { ascending: true })
      .order('departure_time', { ascending: true });
    const departures = (data || []) as Departure[];
    if (demoModeActive) {
      return [...departures, ...demoSessionDepartures.filter(d => d.agency_id === agencyId)]
        .sort((a, b) => `${a.departure_date} ${a.departure_time}`.localeCompare(`${b.departure_date} ${b.departure_time}`));
    }
    return departures;
  },

  async getDeparture(id: string): Promise<Departure | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data } = await supabase.from('departures').select('*').eq('id', id).single();
    return data as Departure | null;
  },

  async getAllDepartures(): Promise<Departure[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase.from('departures').select('*');
    return (data || []) as Departure[];
  },

  async getAllActivities(): Promise<Activity[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase.from('activities').select('*');
    return (data || []) as Activity[];
  },

  async createDeparture(agencyId: string, data: Omit<Departure, 'id' | 'agency_id' | 'created_at' | 'updated_at'>): Promise<Departure> {
    const newDeparture: Departure = {
      ...data,
      id: 'dep-' + Math.random().toString(36).substr(2, 9),
      agency_id: agencyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (demoModeActive) {
      demoSessionDepartures.push(newDeparture);
      dispatchDbUpdate();
      return newDeparture;
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('departures').insert(newDeparture);

      // Notificación
      const { data: act } = await supabase.from('activities').select('name').eq('id', data.activity_id).single();
      const activityName = act?.name || 'Actividad';

      let dateStr = data.departure_date;
      try {
        const parts = data.departure_date.split('-');
        if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}`;
      } catch (_) {}

      await supabase.from('notifications').insert({
        id: 'not-' + Math.random().toString(36).substr(2, 9),
        agency_id: agencyId,
        kind: 'departure_created',
        title: 'Nueva salida programada',
        message: `${activityName} — ${dateStr} ${data.departure_time}`,
        departure_id: newDeparture.id,
        read: false,
        created_at: new Date().toISOString()
      });
    }

    dispatchDbUpdate();
    return newDeparture;
  },

  async updateDeparture(id: string, data: Partial<Omit<Departure, 'id' | 'agency_id' | 'created_at' | 'updated_at'>>): Promise<Departure | null> {
    if (demoModeActive) {
      const idx = demoSessionDepartures.findIndex(d => d.id === id);
      if (idx === -1) return null;
      demoSessionDepartures[idx] = { ...demoSessionDepartures[idx], ...data, updated_at: new Date().toISOString() };
      dispatchDbUpdate();
      return demoSessionDepartures[idx];
    }
    if (!isSupabaseConfigured || !supabase) return null;
    const { data: result } = await supabase
      .from('departures')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    dispatchDbUpdate();
    return result as Departure | null;
  },

  async deleteDeparture(id: string): Promise<void> {
    if (demoModeActive) {
      const idx = demoSessionDepartures.findIndex(d => d.id === id);
      if (idx !== -1) demoSessionDepartures.splice(idx, 1);
      for (let i = demoSessionPassengers.length - 1; i >= 0; i--) {
        if (demoSessionPassengers[i].departure_id === id) demoSessionPassengers.splice(i, 1);
      }
      dispatchDbUpdate();
      return;
    }
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('passengers').delete().eq('departure_id', id);
    await supabase.from('departures').delete().eq('id', id);
    dispatchDbUpdate();
  },

  // ─── PASAJEROS ───

  async getPassengersByDeparture(departureId: string): Promise<Passenger[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase
      .from('passengers')
      .select('*')
      .eq('departure_id', departureId)
      .order('created_at', { ascending: true });
    const passengers = (data || []) as Passenger[];
    if (demoModeActive) {
      return [...passengers, ...demoSessionPassengers.filter(p => p.departure_id === departureId)];
    }
    return passengers;
  },

  async getAllPassengers(): Promise<Passenger[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase.from('passengers').select('*');
    const passengers = (data || []) as Passenger[];
    if (demoModeActive) return [...passengers, ...demoSessionPassengers];
    return passengers;
  },

  async getPassenger(id: string): Promise<Passenger | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data } = await supabase.from('passengers').select('*').eq('id', id).single();
    return data as Passenger | null;
  },

  async createPassenger(data: Omit<Passenger, 'id' | 'created_at'>): Promise<Passenger> {
    const newPassenger: Passenger = {
      ...data,
      id: 'pax-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };

    if (demoModeActive) {
      demoSessionPassengers.push(newPassenger);
      dispatchDbUpdate();
      return newPassenger;
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('passengers').insert(newPassenger);
    }

    dispatchDbUpdate();
    return newPassenger;
  },

  async updatePassenger(id: string, data: Partial<Omit<Passenger, 'id' | 'created_at'>>): Promise<Passenger | null> {
    if (demoModeActive) {
      const idx = demoSessionPassengers.findIndex(p => p.id === id);
      if (idx === -1) return null;
      demoSessionPassengers[idx] = { ...demoSessionPassengers[idx], ...data };
      dispatchDbUpdate();
      return demoSessionPassengers[idx];
    }
    if (!isSupabaseConfigured || !supabase) return null;
    const { data: result } = await supabase
      .from('passengers')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    dispatchDbUpdate();
    return result as Passenger | null;
  },

  async deletePassenger(id: string): Promise<void> {
    if (demoModeActive) {
      const idx = demoSessionPassengers.findIndex(p => p.id === id);
      if (idx !== -1) demoSessionPassengers.splice(idx, 1);
      dispatchDbUpdate();
      return;
    }
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('passengers').delete().eq('id', id);
    dispatchDbUpdate();
  },

  // ─── NOTIFICACIONES ───

  async getNotifications(agencyId: string): Promise<Notification[]> {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });
    const notifications = (data || []) as Notification[];
    if (demoModeActive) {
      return [...demoSessionNotifications.filter(n => n.agency_id === agencyId), ...notifications]
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return notifications;
  },

  async createNotification(agencyId: string, kind: 'departure_created' | 'system' | 'weather_alert', title: string, message: string, departureId: string | null = null): Promise<Notification> {
    const newNot: Notification = {
      id: 'not-' + Math.random().toString(36).substr(2, 9),
      agency_id: agencyId,
      kind,
      title,
      message,
      departure_id: departureId,
      read: false,
      created_at: new Date().toISOString()
    };

    if (demoModeActive) {
      demoSessionNotifications.push(newNot);
      dispatchDbUpdate();
      return newNot;
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('notifications').insert(newNot);
    }

    dispatchDbUpdate();
    return newNot;
  },

  async markNotificationAsRead(id: string): Promise<void> {
    if (demoModeActive) {
      const not = demoSessionNotifications.find(n => n.id === id);
      if (not) not.read = true;
      dispatchDbUpdate();
      return;
    }
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    dispatchDbUpdate();
  },

  async markAllAsRead(agencyId: string): Promise<void> {
    if (demoModeActive) {
      demoSessionNotifications.filter(n => n.agency_id === agencyId).forEach(n => { n.read = true; });
      dispatchDbUpdate();
      return;
    }
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('agency_id', agencyId);
    dispatchDbUpdate();
  },

  // ─── HISTORIAL DE PASAJERO ───

  async getPassengerHistory(fullName: string, phone: string): Promise<{ counts: number; departures: { date: string; name: string }[] }> {
    if (!isSupabaseConfigured || !supabase) return { counts: 0, departures: [] };

    const cleanName = fullName.toLowerCase().trim();
    const cleanPhone = phone.toLowerCase().trim();

    const { data: matches } = await supabase
      .from('passengers')
      .select('*, departures(departure_date, activity_id), activities(name)')
      .or(`full_name.ilike.${cleanName},phone.ilike.${cleanPhone}`);

    if (!matches) return { counts: 0, departures: [] };

    const departuresHistory = matches.map((m: any) => ({
      date: m.departures?.departure_date || 'Fecha desconocida',
      name: m.activities?.name || 'Excursión'
    }));

    return {
      counts: matches.length,
      departures: departuresHistory
    };
  }
};

// ============================================================
// FUNCIONES LEGACY (para compatibilidad con componentes)
// ============================================================

export function getDb(): DBState {
  return getLocalCache() || {
    users: [], agencies: [], agency_members: [], activities: [],
    guides: [], departures: [], passengers: [], notifications: []
  };
}

export function saveDb(state: DBState): void {
  setLocalCache(state);
  dispatchDbUpdate();
}

export function resetDbToDemo(): void {
  // Ya no reseteamos a demo - los datos vienen de Supabase
  localStorage.removeItem(LOCAL_CACHE_KEY);
  dispatchDbUpdate();
}

export async function syncSupabaseToLocal(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const [users, agencies, members, activities, guides, departures, passengers, notifications] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('agencies').select('*'),
      supabase.from('agency_members').select('*'),
      supabase.from('activities').select('*'),
      supabase.from('guides').select('*'),
      supabase.from('departures').select('*'),
      supabase.from('passengers').select('*'),
      supabase.from('notifications').select('*')
    ]);

    const state: DBState = {
      users: (users.data || []) as MockUser[],
      agencies: (agencies.data || []) as Agency[],
      agency_members: (members.data || []) as AgencyMember[],
      activities: (activities.data || []) as Activity[],
      guides: (guides.data || []) as Guide[],
      departures: (departures.data || []) as Departure[],
      passengers: (passengers.data || []) as Passenger[],
      notifications: (notifications.data || []) as Notification[]
    };

    setLocalCache(state);
    return true;
  } catch (error) {
    console.error('Sync failed:', error);
    return false;
  }
}

export const supabaseSync = {
  async upsertUser(user: MockUser) {
    if (!supabase) return;
    await supabase.from('users').upsert(user);
  },
  async upsertAgency(agency: Agency) {
    if (!supabase) return;
    await supabase.from('agencies').upsert(agency);
  },
  async upsertMember(member: AgencyMember) {
    if (!supabase) return;
    await supabase.from('agency_members').upsert(member);
  },
  async deleteMember(id: string) {
    if (!supabase) return;
    await supabase.from('agency_members').delete().eq('id', id);
  },
  async upsertActivity(activity: Activity) {
    if (!supabase) return;
    await supabase.from('activities').upsert(activity);
  },
  async deleteActivity(id: string) {
    if (!supabase) return;
    await supabase.from('activities').delete().eq('id', id);
  },
  async upsertGuide(guide: Guide) {
    if (!supabase) return;
    await supabase.from('guides').upsert(guide);
  },
  async deleteGuide(id: string) {
    if (!supabase) return;
    await supabase.from('guides').delete().eq('id', id);
  },
  async upsertDeparture(departure: Departure) {
    if (!supabase) return;
    await supabase.from('departures').upsert(departure);
  },
  async deleteDeparture(id: string) {
    if (!supabase) return;
    await supabase.from('departures').delete().eq('id', id);
  },
  async upsertPassenger(passenger: Passenger) {
    if (!supabase) return;
    await supabase.from('passengers').upsert(passenger);
  },
  async deletePassenger(id: string) {
    if (!supabase) return;
    await supabase.from('passengers').delete().eq('id', id);
  },
  async upsertNotification(notification: Notification) {
    if (!supabase) return;
    await supabase.from('notifications').upsert(notification);
  },
  async bulkMarkNotificationsRead(agencyId: string) {
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('agency_id', agencyId);
  }
};
