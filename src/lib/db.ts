/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agency, AgencyMember, Activity, Departure, Passenger, Guide, Notification, AgencyRole, MockUser } from '../types';
import { supabase, isSupabaseConfigured, setSupabaseSyncError } from './supabaseClient';
import { getCoordinatesForCity } from './cities';

// Let's create an elegant client-side relational storage engine that emulates Postgres with RLS and triggers!

const LOCAL_STORAGE_KEY = 'rumbo_mock_db';

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

// Low-level helper to push to Supabase in the background (non-blocking)
export const supabaseSync = {
  async upsertUser(user: MockUser) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('users').upsert(user); 
      if (error) console.error('Supabase Sync user error details:', error);
    } catch(e) { console.error('Supabase Sync exception for user:', e); }
  },
  async upsertAgency(agency: Agency) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('agencies').upsert(agency); 
      if (error) console.error('Supabase Sync agency error details:', error);
    } catch(e) { console.error('Supabase Sync exception for agency:', e); }
  },
  async upsertMember(member: AgencyMember) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('agency_members').upsert(member); 
      if (error) console.error('Supabase Sync agency member error details:', error);
    } catch(e) { console.error('Supabase Sync exception for agency member:', e); }
  },
  async deleteMember(id: string) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('agency_members').delete().eq('id', id); 
      if (error) console.error('Supabase Sync delete member error:', error);
    } catch(e) { console.error('Supabase Sync exception delete member:', e); }
  },
  async upsertActivity(activity: Activity) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('activities').upsert(activity); 
      if (error) console.error('Supabase Sync activity error details:', error);
    } catch(e) { console.error('Supabase Sync exception for activity:', e); }
  },
  async deleteActivity(id: string) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('activities').delete().eq('id', id); 
      if (error) console.error('Supabase Sync delete activity error details:', error);
    } catch(e) { console.error('Supabase Sync exception delete activity:', e); }
  },
  async upsertGuide(guide: Guide) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('guides').upsert(guide); 
      if (error) console.error('Supabase Sync guide error details:', error);
    } catch(e) { console.error('Supabase Sync exception for guide:', e); }
  },
  async deleteGuide(id: string) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('guides').delete().eq('id', id); 
      if (error) console.error('Supabase Sync delete guide error details:', error);
    } catch(e) { console.error('Supabase Sync exception delete guide:', e); }
  },
  async upsertDeparture(departure: Departure) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('departures').upsert(departure); 
      if (error) console.error('Supabase Sync departure error details:', error);
    } catch(e) { console.error('Supabase Sync exception for departure:', e); }
  },
  async deleteDeparture(id: string) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('departures').delete().eq('id', id); 
      if (error) console.error('Supabase Sync delete departure error details:', error);
    } catch(e) { console.error('Supabase Sync exception delete departure:', e); }
  },
  async upsertPassenger(passenger: Passenger) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('passengers').upsert(passenger); 
      if (error) console.error('Supabase Sync passenger error details:', error);
    } catch(e) { console.error('Supabase Sync exception for passenger:', e); }
  },
  async deletePassenger(id: string) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('passengers').delete().eq('id', id); 
      if (error) console.error('Supabase Sync delete passenger error details:', error);
    } catch(e) { console.error('Supabase Sync exception delete passenger:', e); }
  },
  async upsertNotification(notification: Notification) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('notifications').upsert(notification); 
      if (error) console.error('Supabase Sync notification error details:', error);
    } catch(e) { console.error('Supabase Sync exception for notification:', e); }
  },
  async bulkMarkNotificationsRead(agencyId: string) {
    if (!isSupabaseConfigured || !supabase) return;
    try { 
      const { error } = await supabase.from('notifications').update({ read: true }).eq('agency_id', agencyId); 
      if (error) console.error('Supabase Sync bulk mark read error details:', error);
    } catch(e) { console.error('Supabase Sync exception for bulk mark read:', e); }
  }
};

// Seed Supabase with initial demo state if it's currently completely empty
async function seedSupabaseIfNeeded(state: DBState) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data: existingAgencies } = await supabase.from('agencies').select('id').limit(1);
    if (!existingAgencies || existingAgencies.length === 0) {
      console.log('🌱 Base de datos de Supabase vacía detectada. Sembrando demo...');
      if (state.users.length) await supabase.from('users').upsert(state.users);
      if (state.agencies.length) await supabase.from('agencies').upsert(state.agencies);
      if (state.agency_members.length) await supabase.from('agency_members').upsert(state.agency_members);
      if (state.activities.length) await supabase.from('activities').upsert(state.activities);
      if (state.guides.length) await supabase.from('guides').upsert(state.guides);
      if (state.departures.length) await supabase.from('departures').upsert(state.departures);
      if (state.passengers.length) await supabase.from('passengers').upsert(state.passengers);
      if (state.notifications.length) await supabase.from('notifications').upsert(state.notifications);
      console.log('🌱 Sembrado de Supabase completado con éxito!');
    }
  } catch (err) {
    console.warn('⚠️ No se pudo sembrar Supabase por completo (generalmente debido a políticas RLS o claves foráneas):', err);
  }
}

// Bidi Synchronization on App load
export async function syncSupabaseToLocal(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    console.log('🔄 Sincronizando datos con Supabase...');
    const [
      resUsers,
      resAgencies,
      resMembers,
      resActivities,
      resGuides,
      resDepartures,
      resPassengers,
      resNotifications
    ] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('agencies').select('*'),
      supabase.from('agency_members').select('*'),
      supabase.from('activities').select('*'),
      supabase.from('guides').select('*'),
      supabase.from('departures').select('*'),
      supabase.from('passengers').select('*'),
      supabase.from('notifications').select('*')
    ]);

    // Check if any of the queries failed (f.e., table relation does not exist yet)
    const errObj = resUsers.error || resAgencies.error || resMembers.error || resActivities.error || resGuides.error || resDepartures.error || resPassengers.error || resNotifications.error;
    if (errObj) {
      console.warn('⚠️ Supabase table load error:', errObj);
      setSupabaseSyncError(true);
      throw new Error(`Supabase table error: ${errObj.message} (Code: ${errObj.code})`);
    }

    // Reset error state on completely successful fetch
    setSupabaseSyncError(false);

    const rUsers = resUsers.data;
    const rAgencies = resAgencies.data;
    const rMembers = resMembers.data;
    const rActivities = resActivities.data;
    const rGuides = resGuides.data;
    const rDepartures = resDepartures.data;
    const rPassengers = resPassengers.data;
    const rNotifications = resNotifications.data;

    const localDb = getDb();

    // Helper to merge collections by ID, giving precedence to remote values for existing records
    // but preserving local-only records that haven't been pushed to Supabase yet.
    const mergeCollections = <T extends { id: string }>(localList: T[], remoteList: T[] | null): T[] => {
      const itemsMap = new Map<string, T>();
      if (localList) {
        localList.forEach(item => {
          if (item && item.id) {
            itemsMap.set(item.id, item);
          }
        });
      }
      if (remoteList) {
        remoteList.forEach(item => {
          if (item && item.id) {
            itemsMap.set(item.id, item);
          }
        });
      }
      return Array.from(itemsMap.values());
    };

    // If Supabase has no agencies at all, load local seed demo data
    const hasData = rAgencies && rAgencies.length > 0;
    if (!hasData) {
      await seedSupabaseIfNeeded(localDb);
      return true;
    }

    const stateToApply: DBState = {
      users: mergeCollections(localDb.users, rUsers),
      agencies: mergeCollections(localDb.agencies, rAgencies),
      agency_members: mergeCollections(localDb.agency_members, rMembers),
      activities: mergeCollections(localDb.activities, rActivities),
      guides: mergeCollections(localDb.guides, rGuides),
      departures: mergeCollections(localDb.departures, rDepartures),
      passengers: mergeCollections(localDb.passengers, rPassengers),
      notifications: mergeCollections(localDb.notifications, rNotifications),
    };

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateToApply));
    window.dispatchEvent(new Event('rumbo_db_updated'));
    console.log('✅ Supabase -> LocalStorage: sincronizado correctamente.');
    return true;
  } catch (error) {
    console.error('⚠️ Supabase sync failed, continuing offline-first with localStorage:', error);
    return false;
  }
}


// Initial mock data to paint a professional, vivid LatAm tourism scenario right out of the box
const initialDbState: DBState = {
  users: [
    { id: 'usr-admin1', email: 'admin@rumbo.com', full_name: 'Matias Abarca' },
    { id: 'usr-guide1', email: 'guia@rumbo.com', full_name: 'Clara Milanesi' },
    { id: 'usr-guide2', email: 'agustin@rumbo.com', full_name: 'Agustín Somma' }
  ],
  agencies: [
    {
      id: 'agc-1',
      owner_id: 'usr-admin1',
      name: 'Rumbo',
      join_code: 'RUMBOAV',
      logo_url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=150&auto=format&fit=crop&q=80',
      city: 'Puerto Varas, Región de Los Lagos',
      latitude: -41.3198,
      longitude: -72.9854,
      subscription_plan: 'pro',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  agency_members: [
    {
      id: 'mem-1',
      agency_id: 'agc-1',
      user_id: 'usr-guide1',
      role: AgencyRole.GUIA,
      created_at: new Date().toISOString()
    }
  ],
  activities: [
    {
      id: 'act-1',
      agency_id: 'agc-1',
      name: 'Rafting Río Petrohué (Clase III)',
      description: 'Emocionante descenso por los rápidos del río Petrohué rodeado de espectaculares bosques endémicos del sur de Chile.',
      duration_minutes: 240,
      price: 65000,
      currency: 'CLP',
      capacity_max: 12,
      meeting_point: 'Oficina Rumbo Puerto Varas (Del Salvador 320) o pick-up en hotel',
      photo_url: 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=600&auto=format&fit=crop&q=80',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'act-2',
      agency_id: 'agc-1',
      name: 'Ascenso Cumbre Volcán Osorno',
      description: 'Travesía de trekking técnico y escalada suave por los glaciares del imponente volcán Osorno con guía de montaña certificado.',
      duration_minutes: 480,
      price: 150000,
      currency: 'CLP',
      capacity_max: 16,
      meeting_point: 'Inicio de Sendero Glaciar (Centro de Ski Osorno)',
      photo_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'act-3',
      agency_id: 'agc-1',
      name: 'Kayak de Travesía Lago Llanquihue',
      description: 'Paseo en kayak doble recorriendo las mansas aguas del lago Llanquihue al atardecer, ideal para fotografía y fauna lacustre.',
      duration_minutes: 180,
      price: 45000,
      currency: 'CLP',
      capacity_max: 40,
      meeting_point: 'Playa Puerto Varas (costanera frente al casino)',
      photo_url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&auto=format&fit=crop&q=80',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'act-4',
      agency_id: 'agc-1',
      name: 'Trekking Selva Valdiviana Alerce Andino',
      description: 'Senda arqueológica por la selva valdiviana observando alerces milenarios de hasta 3.000 años y caídas de agua escondidas.',
      duration_minutes: 360,
      price: 55000,
      currency: 'CLP',
      capacity_max: 20,
      meeting_point: 'Acceso Parque Nacional Alerce Andino',
      photo_url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  guides: [
    {
      id: 'gd-1',
      agency_id: 'agc-1',
      user_id: 'usr-guide1',
      full_name: 'Clara Milanesi',
      phone: '+5492944654321',
      email: 'clara@rumbo.com',
      specialties: ['Rafting clase IV', 'Soporte vital', 'Rescate en aguas rápidas'],
      active: true,
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'gd-2',
      agency_id: 'agc-1',
      user_id: 'usr-guide2',
      full_name: 'Agustín Somma',
      phone: '+5492944123456',
      email: 'agustin@rumbo.com',
      specialties: ['Trekking de montaña', 'Meteorología', 'Flora/Fauna Andina'],
      active: true,
      avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'gd-3',
      agency_id: 'agc-1',
      user_id: null,
      full_name: 'Mariano Pehuén',
      phone: '+5492944987654',
      email: 'mariano@gmail.com',
      specialties: ['Cabalgatas', 'Fotografía de avistaje'],
      active: true,
      avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  departures: [
    {
      id: 'dep-1',
      agency_id: 'agc-1',
      activity_id: 'act-1',
      guide_id: 'gd-1',
      departure_date: new Date().toISOString().split('T')[0], // Today
      departure_time: '10:00',
      status: 'programada',
      notes: 'Llevar calzado extra que se pueda mojar. Pronóstico templado.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'dep-2',
      agency_id: 'agc-1',
      activity_id: 'act-2',
      guide_id: 'gd-2',
      departure_date: new Date().toISOString().split('T')[0], // Today
      departure_time: '08:30',
      status: 'en_curso',
      notes: 'Salida puntual. El viento arriba está pronosticado en 40km/h.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'dep-3',
      agency_id: 'agc-1',
      activity_id: 'act-4',
      guide_id: null,
      departure_date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      departure_time: '14:00',
      status: 'programada',
      notes: 'Grupo escolar de Buenos Aires. Requiere arneses chicos.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'dep-4',
      agency_id: 'agc-1',
      activity_id: 'act-3',
      guide_id: 'gd-2',
      departure_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
      departure_time: '09:00',
      status: 'finalizada',
      notes: 'Sin novedades, el glaciar estuvo espectacular.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'dep-5',
      agency_id: 'agc-1',
      activity_id: 'act-1',
      guide_id: 'gd-1',
      departure_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // Day after tomorrow
      departure_time: '09:30',
      status: 'programada',
      notes: 'Familia extendida.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  passengers: [
    // We populate repeated names and phones intentionally so the ★ recurrent badge can be showcased!
    {
      id: 'pax-1',
      departure_id: 'dep-1',
      full_name: 'Carlos Solari',
      phone: '+5491144445555',
      pax_count: 2,
      checked_in: true,
      notes: 'Solicitó vianda vegetariana.',
      created_at: new Date().toISOString()
    },
    {
      id: 'pax-2',
      departure_id: 'dep-1',
      full_name: 'Inés Estévez',
      phone: '+5491199998888',
      pax_count: 4,
      checked_in: false,
      notes: 'Viene con dos chicos de 8 y 11.',
      created_at: new Date().toISOString()
    },
    {
      id: 'pax-3',
      departure_id: 'dep-2',
      full_name: 'Esteban Prol',
      phone: '+5493415556677',
      pax_count: 1,
      checked_in: true,
      notes: 'Calza talle 43 para calzado de trail.',
      created_at: new Date().toISOString()
    },
    {
      id: 'pax-4',
      departure_id: 'dep-2',
      full_name: 'Carlos Solari', // RECURRENT!
      phone: '+5491144445555',  // Same phone, demonstrating ★ recurring passenger counting system
      pax_count: 3,
      checked_in: true,
      notes: 'Ya hizo rafting el día anterior con nosotros!',
      created_at: new Date().toISOString()
    },
    {
      id: 'pax-5',
      departure_id: 'dep-3',
      full_name: 'Romina Gaetani',
      phone: '+5491177778888',
      pax_count: 2,
      checked_in: false,
      notes: 'Pasajero fiel.',
      created_at: new Date().toISOString()
    },
    {
      id: 'pax-6',
      departure_id: 'dep-4',
      full_name: 'Esteban Prol', // RECURRENT!
      phone: '+5493415556677',
      pax_count: 2,
      checked_in: true,
      notes: 'Hizo el lago el día anterior.',
      created_at: new Date().toISOString()
    },
    {
      id: 'pax-7',
      departure_id: 'dep-3',
      full_name: 'Carlos Solari', // RECURRENT again!
      phone: '+5491144445555',
      pax_count: 1,
      checked_in: false,
      notes: 'Inspección vip.',
      created_at: new Date().toISOString()
    }
  ],
  notifications: [
    {
      id: 'not-1',
      agency_id: 'agc-1',
      kind: 'departure_created',
      title: 'Nueva salida programada',
      message: 'Rafting Extremo Río Manso — programado para hoy a las 10:00',
      departure_id: 'dep-1',
      read: false,
      created_at: new Date().toISOString()
    },
    {
      id: 'not-2',
      agency_id: 'agc-1',
      kind: 'system',
      title: '¡Bienvenido a Rumbo!',
      message: 'Puedes copiar tu código de entrada "RUMBOPAT" en la sección Integrantes para que tus guías se unan.',
      departure_id: null,
      read: false,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ]
};

// Seed or load current state
export function getDb(): DBState {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialDbState));
    return initialDbState;
  }
  try {
    const dbState = JSON.parse(stored) as DBState;
    let updated = false;
    if (dbState.users) {
      const adminUser = dbState.users.find(u => u.id === 'usr-admin1' || u.email.toLowerCase() === 'admin@rumbo.com');
      if (adminUser && adminUser.full_name !== 'Matias Abarca') {
        adminUser.full_name = 'Matias Abarca';
        updated = true;
      }
    }
    // Automatically migrate city if it's Bariloche
    if (dbState.agencies) {
      dbState.agencies.forEach(agency => {
        if (agency.city && agency.city.toLowerCase().includes('bariloche')) {
          agency.city = 'Puerto Varas, Región de Los Lagos';
          agency.latitude = -41.3198;
          agency.longitude = -72.9854;
          updated = true;
        }
      });
    }
    // Automatically migrate old activities to pristine Puerto Varas ones
    if (dbState.activities) {
      const hasOldName = dbState.activities.some(a => a.name.includes('Manso') || a.name.includes('Fitz') || a.name.includes('Moreno'));
      if (hasOldName) {
        dbState.activities = initialDbState.activities;
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbState));
    }
    return dbState;
  } catch (e) {
    console.error('Error parsing simulated DB, resetting...', e);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialDbState));
    return initialDbState;
  }
}

export function saveDb(state: DBState): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  // Dispatch custom event to notify listeners across components of simulated realtime sync
  window.dispatchEvent(new Event('rumbo_db_updated'));
}

export function resetDbToDemo(): void {
  saveDb(initialDbState);
}

// SIMULATED DATABASE FUNCTIONS / QUERIES

export const db = {
  // Query agencies
  lookupAgencyByCode(joinCode: string): Agency | null {
    const fullDb = getDb();
    const code = joinCode.toUpperCase().trim();
    return fullDb.agencies.find(a => a.join_code === code) || null;
  },

  // Add agency for Admin user
  createAgency(ownerId: string, name: string, city: string, logoUrl?: string): Agency {
    const fullDb = getDb();
    
    // Generate code
    const generatedCode = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() + 
                         Math.floor(1000 + Math.random() * 9000);
                         
    const cleanLogoUrl = logoUrl || 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=150';

    const coords = getCoordinatesForCity(city);

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

    fullDb.agencies.push(newAgency);
    saveDb(fullDb);

    // Push to Supabase
    supabaseSync.upsertAgency(newAgency);

    // Notify info message
    this.createNotification(newAgency.id, 'system', 'Agencia Creada', `Bienvenido a ${name}. Tu código de guía es: ${generatedCode}`, null);

    return newAgency;
  },

  updateAgency(agencyId: string, data: Partial<Agency>): Agency | null {
    const fullDb = getDb();
    const index = fullDb.agencies.findIndex(a => a.id === agencyId);
    if (index === -1) return null;
    
    // Auto-update coords if city is edited
    const updatedCoords = data.city ? getCoordinatesForCity(data.city) : {};
    
    const updatedAgency = {
      ...fullDb.agencies[index],
      ...data,
      ...updatedCoords,
      updated_at: new Date().toISOString()
    };
    
    fullDb.agencies[index] = updatedAgency;
    saveDb(fullDb);
    
    // Push to Supabase
    supabaseSync.upsertAgency(updatedAgency);
    
    // Dispatch events to refresh weather & UI immediately
    window.dispatchEvent(new Event('rumbo_weather_updated'));
    window.dispatchEvent(new Event('rumbo_db_updated'));
    
    return updatedAgency;
  },

  joinAgencyAsGuide(args: { joinCode: string; userId: string; email: string; fullName: string, phone: string, avatarUrl?: string }): { success: boolean; error?: string; agency?: Agency; member?: AgencyMember; guide?: Guide } {
    const fullDb = getDb();
    const agency = this.lookupAgencyByCode(args.joinCode);
    if (!agency) {
      return { success: false, error: 'Código de agencia inválido. Verifica e intenta de nuevo.' };
    }

    // Check if user is already an owner of an agency (admin role)
    const isOwner = fullDb.agencies.some(a => a.owner_id === args.userId);
    if (isOwner) {
      return { success: false, error: 'Ya eres dueño administrador de una agencia registrada. No puedes unirte como guía.' };
    }

    // Check if already a member of an agency
    const isAlreadyMember = fullDb.agency_members.some(m => m.user_id === args.userId);
    if (isAlreadyMember) {
      return { success: false, error: 'Ya estás registrado como guía en otra agencia.' };
    }

    // Register member row
    const newMember: AgencyMember = {
      id: 'mem-' + Math.random().toString(36).substr(2, 9),
      agency_id: agency.id,
      user_id: args.userId,
      role: AgencyRole.GUIA,
      created_at: new Date().toISOString()
    };

    fullDb.agency_members.push(newMember);

    // Create guide profile if it doesn't exist for this agency/user combination
    const hasGuideProfile = fullDb.guides.some(g => g.user_id === args.userId && g.agency_id === agency.id);
    let newGuideProfile: Guide | null = null;
    if (!hasGuideProfile) {
       newGuideProfile = {
        id: 'gd-' + Math.random().toString(36).substr(2, 9),
        agency_id: agency.id,
        user_id: args.userId,
        full_name: args.fullName,
        phone: args.phone || '+549110000000',
        email: args.email,
        specialties: ['Turismo general'],
        active: false,
        avatar_url: args.avatarUrl || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      fullDb.guides.push(newGuideProfile);
    }

    saveDb(fullDb);

    // Sync Join to Supabase
    supabaseSync.upsertMember(newMember);
    if (newGuideProfile) {
      supabaseSync.upsertGuide(newGuideProfile);
    }

    this.createNotification(
      agency.id, 
      'system', 
      'Solicitud de Unión de Guía', 
      `${args.fullName} se registró con el código corporativo. Requiere aprobación en el panel de Guías para habilitar su acceso.`, 
      null
    );

    return { success: true, agency, member: newMember, guide: newGuideProfile };
  },

  // Activities CRUD
  getActivities(agencyId: string) {
    return getDb().activities.filter(a => a.agency_id === agencyId);
  },

  getActivity(id: string): Activity | null {
    return getDb().activities.find(a => a.id === id) || null;
  },

  createActivity(agencyId: string, data: Omit<Activity, 'id' | 'agency_id' | 'created_at' | 'updated_at'>): Activity {
    const fullDb = getDb();
    
    // Choose beautiful background based on title keyword if photo_url is missing
    let photo = data.photo_url;
    if (!photo) {
      const keywords = data.name.toLowerCase();
      if (keywords.includes('rafting') || keywords.includes('agua') || keywords.includes('rio')) {
        photo = 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=600';
      } else if (keywords.includes('trekking') || keywords.includes('montaña') || keywords.includes('caminata') || keywords.includes('trek')) {
        photo = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600';
      } else if (keywords.includes('navecacion') || keywords.includes('barco') || keywords.includes('lago')) {
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

    fullDb.activities.push(newActivity);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.upsertActivity(newActivity);

    return newActivity;
  },

  updateActivity(id: string, data: Partial<Omit<Activity, 'id' | 'agency_id' | 'created_at' | 'updated_at'>>): Activity {
    const fullDb = getDb();
    const idx = fullDb.activities.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Actividad no encontrada');
    
    const updated = {
      ...fullDb.activities[idx],
      ...data,
      updated_at: new Date().toISOString()
    };
    fullDb.activities[idx] = updated;
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.upsertActivity(updated);

    return updated;
  },

  deleteActivity(id: string): void {
    const fullDb = getDb();
    fullDb.activities = fullDb.activities.filter(a => a.id !== id);
    
    // Also cancel or clean up scheduled departures to keep referential integrity
    const departingIds = fullDb.departures.filter(d => d.activity_id === id).map(d => d.id);
    fullDb.departures = fullDb.departures.filter(d => d.activity_id !== id);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.deleteActivity(id);
    for (const depId of departingIds) {
      supabaseSync.deleteDeparture(depId);
    }
  },

  // Guides CRUD
  getGuides(agencyId: string) {
    return getDb().guides.filter(g => g.agency_id === agencyId);
  },

  createGuide(agencyId: string, data: Omit<Guide, 'id' | 'agency_id' | 'created_at' | 'updated_at'>): Guide {
    const fullDb = getDb();
    const newGuide: Guide = {
      ...data,
      id: 'gd-' + Math.random().toString(36).substr(2, 9),
      agency_id: agencyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    fullDb.guides.push(newGuide);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.upsertGuide(newGuide);

    return newGuide;
  },

  updateGuide(id: string, data: Partial<Omit<Guide, 'id' | 'agency_id' | 'created_at' | 'updated_at'>>): Guide {
    const fullDb = getDb();
    const idx = fullDb.guides.findIndex(g => g.id === id);
    if (idx === -1) throw new Error('Guía no encontrado');
    
    const updated = {
      ...fullDb.guides[idx],
      ...data,
      updated_at: new Date().toISOString()
    };
    fullDb.guides[idx] = updated;
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.upsertGuide(updated);

    return updated;
  },

  deleteGuide(id: string): void {
    const fullDb = getDb();
    fullDb.guides = fullDb.guides.filter(g => g.id !== id);
    // Set guide_id to null for corresponding departures
    fullDb.departures = fullDb.departures.map(d => d.guide_id === id ? { ...d, guide_id: null } : d);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.deleteGuide(id);
  },

  // Members listing
  getMembers(agencyId: string): { member: AgencyMember; user: MockUser }[] {
    const fullDb = getDb();
    const members = fullDb.agency_members.filter(m => m.agency_id === agencyId);
    return members.map(m => {
      const userObj = fullDb.users.find(u => u.id === m.user_id) || { id: m.user_id, email: 'invitado@rumbo.com', full_name: 'Guía Registrado' };
      return { member: m, user: userObj };
    });
  },

  updateMemberRole(memberId: string, role: AgencyRole): void {
    const fullDb = getDb();
    const mIdx = fullDb.agency_members.findIndex(m => m.id === memberId);
    if (mIdx !== -1) {
      fullDb.agency_members[mIdx].role = role;
      saveDb(fullDb);

      // Supabase Sync
      supabaseSync.upsertMember(fullDb.agency_members[mIdx]);
    }
  },

  deleteMember(memberId: string): void {
    const fullDb = getDb();
    fullDb.agency_members = fullDb.agency_members.filter(m => m.id !== memberId);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.deleteMember(memberId);
  },

  // Departures CRUD
  getDepartures(agencyId: string) {
    return getDb().departures.filter(d => d.agency_id === agencyId);
  },

  getDeparture(id: string): Departure | null {
    return getDb().departures.find(d => d.id === id) || null;
  },

  getAllDepartures() {
    return getDb().departures;
  },

  getAllActivities() {
    return getDb().activities;
  },

  createDeparture(agencyId: string, data: Omit<Departure, 'id' | 'agency_id' | 'created_at' | 'updated_at'>): Departure {
    const fullDb = getDb();
    const newDeparture: Departure = {
      ...data,
      id: 'dep-' + Math.random().toString(36).substr(2, 9),
      agency_id: agencyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    fullDb.departures.push(newDeparture);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.upsertDeparture(newDeparture);

    // TRIGGER COMPLIANCE 3.5: tg_notify_new_departure()
    const activityName = fullDb.activities.find(a => a.id === data.activity_id)?.name || 'Actividad';
    
    // format date DD/MM
    let dateStr = data.departure_date;
    try {
      const parts = data.departure_date.split('-');
      if (parts.length === 3) {
        dateStr = `${parts[2]}/${parts[1]}`;
      }
    } catch (_) {}

    this.createNotification(
      agencyId, 
      'departure_created', 
      'Nueva salida programada', 
      `${activityName} — ${dateStr} ${data.departure_time}`, 
      newDeparture.id
    );

    return newDeparture;
  },

  updateDeparture(id: string, data: Partial<Omit<Departure, 'id' | 'agency_id' | 'created_at' | 'updated_at'>>): Departure {
    const fullDb = getDb();
    const idx = fullDb.departures.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Salida no encontrada');
    
    const updated = {
      ...fullDb.departures[idx],
      ...data,
      updated_at: new Date().toISOString()
    };
    fullDb.departures[idx] = updated;
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.upsertDeparture(updated);

    return updated;
  },

  deleteDeparture(id: string): void {
    const fullDb = getDb();
    fullDb.departures = fullDb.departures.filter(d => d.id !== id);
    // Also delete or orphan passengers as required
    const departingPassengers = fullDb.passengers.filter(p => p.departure_id === id);
    fullDb.passengers = fullDb.passengers.filter(p => p.departure_id !== id);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.deleteDeparture(id);
    for (const pax of departingPassengers) {
      supabaseSync.deletePassenger(pax.id);
    }
  },

  // Passengers CRUD
  getPassengersByDeparture(departureId: string) {
    return getDb().passengers.filter(p => p.departure_id === departureId);
  },

  getAllPassengers() {
    return getDb().passengers;
  },

  getPassenger(id: string): Passenger | null {
    return getDb().passengers.find(p => p.id === id) || null;
  },

  createPassenger(data: Omit<Passenger, 'id' | 'created_at'>): Passenger {
    const fullDb = getDb();
    const newPassenger: Passenger = {
      ...data,
      id: 'pax-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    fullDb.passengers.push(newPassenger);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.upsertPassenger(newPassenger);

    return newPassenger;
  },

  updatePassenger(id: string, data: Partial<Omit<Passenger, 'id' | 'created_at'>>): Passenger {
    const fullDb = getDb();
    const idx = fullDb.passengers.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Pasajero no encontrado');
    
    const updated = {
      ...fullDb.passengers[idx],
      ...data
    };
    fullDb.passengers[idx] = updated;
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.upsertPassenger(updated);

    return updated;
  },

  deletePassenger(id: string): void {
    const fullDb = getDb();
    fullDb.passengers = fullDb.passengers.filter(p => p.id !== id);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.deletePassenger(id);
  },

  // Notifications
  getNotifications(agencyId: string) {
    return getDb().notifications.filter(n => n.agency_id === agencyId).sort((a,b) => b.created_at.localeCompare(a.created_at));
  },

  createNotification(agencyId: string, kind: 'departure_created' | 'system' | 'weather_alert', title: string, message: string, departureId: string | null = null): Notification {
    const fullDb = getDb();
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
    fullDb.notifications.push(newNot);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.upsertNotification(newNot);

    return newNot;
  },

  markNotificationAsRead(id: string): void {
    const fullDb = getDb();
    const idx = fullDb.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      fullDb.notifications[idx].read = true;
      saveDb(fullDb);

      // Supabase Sync
      supabaseSync.upsertNotification(fullDb.notifications[idx]);
    }
  },

  markAllAsRead(agencyId: string): void {
    const fullDb = getDb();
    fullDb.notifications = fullDb.notifications.map(n => n.agency_id === agencyId ? { ...n, read: true } : n);
    saveDb(fullDb);

    // Supabase Sync
    supabaseSync.bulkMarkNotificationsRead(agencyId);
  },

  // Passenger History Check (Badge feature requested: "★ badge if name/tel matches previously and count total")
  getPassengerHistory(fullName: string, phone: string): { counts: number; departures: { date: string; name: string }[] } {
    const fullDb = getDb();
    const cleanName = fullName.toLowerCase().trim();
    const cleanPhone = phone.toLowerCase().trim();

    // Match either name AND phone, or if they have the exact same phone (as phones are unique per person)
    const matches = fullDb.passengers.filter(p => {
      const pName = p.full_name.toLowerCase().trim();
      const pPhone = p.phone.toLowerCase().trim();
      return (pName === cleanName && pPhone === cleanPhone) || (pPhone !== '' && pPhone === cleanPhone);
    });

    const departuresHistory = matches.map(m => {
      const dep = fullDb.departures.find(d => d.id === m.departure_id);
      const act = dep ? fullDb.activities.find(a => a.id === dep.activity_id) : null;
      return {
        date: dep?.departure_date || 'Fecha desconocida',
        name: act?.name || 'Excursión'
      };
    });

    return {
      counts: matches.length,
      departures: departuresHistory
    };
  }
};
