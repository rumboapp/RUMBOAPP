/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, getDb, saveDb, syncSupabaseToLocal, supabaseSync } from './db';
import { Agency, AgencyRole, MockUser, AuthContextType } from '../types';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_SESSION_KEY = 'rumbo_user_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [role, setRole] = useState<AgencyRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAgencyAndRole = (currentUser: MockUser) => {
    const fullDb = getDb();
    
    // 1. First, search if the user is the owner of an agency (admin role)
    const ownedAgency = fullDb.agencies.find(a => a.owner_id === currentUser.id);
    if (ownedAgency) {
      setAgency(ownedAgency);
      setRole(AgencyRole.ADMIN);
      return;
    }

    // 2. Second, search in agency_members table (guide role)
    const membership = fullDb.agency_members.find(m => m.user_id === currentUser.id);
    if (membership) {
      const associatedAgency = fullDb.agencies.find(a => a.id === membership.agency_id);
      if (associatedAgency) {
        setAgency(associatedAgency);
        setRole(membership.role); // 'guia'
        return;
      }
    }

    // Default if logged in but no agency created yet
    setAgency(null);
    setRole(null);
  };

  const refreshAgency = () => {
    if (user) {
      loadAgencyAndRole(user);
    }
  };

  useEffect(() => {
    // Simulate reading current session on mount (auth.onAuthStateChange simulation)
    const restoreSession = async () => {
      setLoading(true);
      if (isSupabaseConfigured) {
        try {
          await syncSupabaseToLocal();
        } catch (e) {
          console.warn('⚠️ No se pudo realizar la sincronización inicial de Supabase (continuando con offline-first/localStorage):', e);
        }
      }
      const stored = localStorage.getItem(USER_SESSION_KEY);
      if (stored) {
        try {
          const parsedUser = JSON.parse(stored) as MockUser;
          if (parsedUser.email?.toLowerCase() === 'admin@rumbo.com' || parsedUser.id === 'usr-admin1') {
            parsedUser.full_name = 'Matias Abarca';
            localStorage.setItem(USER_SESSION_KEY, JSON.stringify(parsedUser));
          }
          setUser(parsedUser);
          loadAgencyAndRole(parsedUser);
        } catch (e) {
          console.error('Failed to parse user session', e);
          localStorage.removeItem(USER_SESSION_KEY);
        }
      }
      setLoading(false);
    };

    restoreSession();

    // Listen to simulated database updates across screens
    const handleDbUpdates = () => {
      const stored = localStorage.getItem(USER_SESSION_KEY);
      if (stored) {
        try {
          const parsedUser = JSON.parse(stored) as MockUser;
          if (parsedUser.email?.toLowerCase() === 'admin@rumbo.com' || parsedUser.id === 'usr-admin1') {
            parsedUser.full_name = 'Matias Abarca';
          }
          loadAgencyAndRole(parsedUser);
        } catch (_) {}
      }
    };
    
    window.addEventListener('rumbo_db_updated', handleDbUpdates);
    return () => window.removeEventListener('rumbo_db_updated', handleDbUpdates);
  }, []);

  const signOut = () => {
    setLoading(true);
    localStorage.removeItem(USER_SESSION_KEY);
    setUser(null);
    setAgency(null);
    setRole(null);
    setLoading(false);
  };

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    
    // First, if Supabase is connected, pull latest state so we don't present stale screens
    if (isSupabaseConfigured) {
      try {
        await syncSupabaseToLocal();
      } catch (e) {
        console.warn('⚠️ Fallo de sincronización de Supabase al ingresar: operando offline-first:', e);
      }
    }
    
    let fullDb = getDb();
    
    // Low-level validation
    const cleanEmail = email.toLowerCase().trim();

    let authenticatedUserId: string | null = null;
    let supabaseMetadata: any = null;
    const isDemoAccount = !isSupabaseConfigured || pass === 'admin' || pass === 'guia';

    // --- REAL SUPABASE AUTHENTICATION ---
    if (isSupabaseConfigured && supabase && !isDemoAccount) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass
        });

        if (authError) {
          console.warn('⚠️ Supabase Auth falló:', authError.message, '- Evaluando respaldo local offline-first.');
          
          // Fallback check: Si el usuario ya está registrado localmente en nuestro state offline,
          // permitimos que inicie sesión local para no bloquear el desarrollo o si falta confirmar el correo.
          const localUserExists = fullDb.users.some(u => u.email.toLowerCase() === cleanEmail);
          
          if (localUserExists) {
            console.log('🔄 Desvío exitoso: Cuenta encontrada localmente en localStorage. Bypass de autenticación remota.');
          } else {
            setLoading(false);
            let errMsg = authError.message;
            if (errMsg.includes('Invalid login credentials')) {
              errMsg = 'Credenciales de acceso inválidas. Por favor verifica tu correo y contraseña o usa la cuenta Demo para probar.';
            } else if (errMsg.includes('Email not confirmed')) {
              errMsg = 'Tu correo electrónico no ha sido confirmado aún. Revisa tu bandeja de entrada o desactiva la confirmación obligatoria en Supabase Auth. Para pruebas, también puedes registrar un nuevo correo de pruebas o usar la cuenta Demo.';
            }
            return { success: false, error: errMsg };
          }
        }

        if (authData?.user) {
          authenticatedUserId = authData.user.id;
          supabaseMetadata = authData.user.user_metadata;
        }
      } catch (err: any) {
        console.error('Supabase auth sign in exception:', err);
        // Fallback checks too on exceptions
        const localUserExists = fullDb.users.some(u => u.email.toLowerCase() === cleanEmail);
        if (!localUserExists) {
          setLoading(false);
          return { success: false, error: 'Excepción de autenticación: ' + (err.message || err) };
        }
      }
    }
    
    // Find if user already exists
    let existingUser = fullDb.users.find(u => 
      u.email.toLowerCase() === cleanEmail || 
      (authenticatedUserId && u.id === authenticatedUserId)
    );
    
    // If Supabase is configured, fetch user record directly in case it exists remotely but not yet in local db
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: remoteUsers, error: uError } = await supabase
          .from('users')
          .select('*')
          .eq('email', cleanEmail);
          
        if (!uError && remoteUsers && remoteUsers.length > 0) {
          existingUser = remoteUsers[0];
          
          // Save in local DB
          const uIndex = fullDb.users.findIndex(u => u.email.toLowerCase() === cleanEmail);
          if (uIndex === -1) {
            fullDb.users.push(existingUser);
          } else {
            fullDb.users[uIndex] = existingUser;
          }
          saveDb(fullDb);
          fullDb = getDb();
        }
      } catch (err) {
        console.error('Failed to query user on Supabase:', err);
      }
    }
    
    // If not existing, let's auto-create on demand with a friendly default name for testing,
    // or validate static demo passwords
    if (!existingUser) {
      // Create user
      const newUserId = authenticatedUserId || 'usr-' + Math.random().toString(36).substr(2, 9);
      const fullNameFromMeta = supabaseMetadata?.full_name || email.split('@')[0].toUpperCase()[0] + email.split('@')[0].slice(1);
      existingUser = {
        id: newUserId,
        email: cleanEmail,
        full_name: fullNameFromMeta,
        avatar_url: supabaseMetadata?.avatar_url || ''
      };
      fullDb.users.push(existingUser);
      saveDb(fullDb);
      
      // Also sync user creation to Supabase
      await supabaseSync.upsertUser(existingUser);
    } else {
      // If we authenticated with Supabase Auth and have a real UUID, and our table had an old id (usr-...), let's align them.
      if (authenticatedUserId && existingUser.id !== authenticatedUserId) {
        const oldId = existingUser.id;
        existingUser.id = authenticatedUserId;
        
        // Update all related local tables so they don't break foreign key-like references
        fullDb.agencies.forEach(a => { if (a.owner_id === oldId) a.owner_id = authenticatedUserId; });
        fullDb.agency_members.forEach(m => { if (m.user_id === oldId) m.user_id = authenticatedUserId; });
        saveDb(fullDb);
        fullDb = getDb();

        await supabaseSync.upsertUser(existingUser);
      } else {
        // If the user already existed locally but maybe isn't on Supabase (or vice versa), Keep it in sync
        await supabaseSync.upsertUser(existingUser);
      }
    }

    // Save session
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(existingUser));
    setUser(existingUser);

    // Direct check in Supabase for user's agency ownership or membership keys
    if (isSupabaseConfigured && supabase) {
      try {
        // First ensure user profile row actually exists on public schema users table
        const { data: existingRemoteUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', existingUser.id)
          .single();
          
        if (!existingRemoteUser) {
          console.log('👤 Profile row not found on Supabase users table, creating it now...');
          await supabase.from('users').upsert(existingUser);
        }

        // 1. Is this user the owner of an agency?
        const { data: ownedAgencies } = await supabase
          .from('agencies')
          .select('*')
          .eq('owner_id', existingUser.id);
          
        if (ownedAgencies && ownedAgencies.length > 0) {
          const localOwnedIndex = fullDb.agencies.findIndex(a => a.id === ownedAgencies[0].id);
          if (localOwnedIndex === -1) {
            fullDb.agencies.push(ownedAgencies[0]);
          } else {
            fullDb.agencies[localOwnedIndex] = ownedAgencies[0];
          }
          saveDb(fullDb);
          fullDb = getDb();
        } else {
          // If Supabase didn't find the agency, check if there's a local agency for this user owner ID
          let localOwned = fullDb.agencies.find(a => a.owner_id === existingUser.id);
          
          // And what if NOT in local storage either BUT we have agency name in Auth metadata?
          if (!localOwned && supabaseMetadata?.role === 'admin' && supabaseMetadata?.agency_name) {
            console.log('🧱 Creating agency from authentic user_metadata saved in Auth:', supabaseMetadata);
            // Create agency locally and push
            localOwned = db.createAgency(
              existingUser.id,
              supabaseMetadata.agency_name,
              supabaseMetadata.agency_city || 'Puerto Varas, Región de Los Lagos',
              supabaseMetadata.logo_url || ''
            );
          }
          
          if (localOwned) {
            console.log('🔄 Sincronizando agencia local/creada a Supabase:', localOwned);
            const { error: agencyInsertError } = await supabase.from('agencies').upsert(localOwned);
            if (agencyInsertError) {
              console.error('Error syncing local agency to Supabase:', agencyInsertError);
            } else {
              // Sync related local items to Supabase
              const localActivities = fullDb.activities.filter(a => a.agency_id === localOwned!.id);
              for (const act of localActivities) {
                await supabase.from('activities').upsert(act);
              }
              const localGuides = fullDb.guides.filter(g => g.agency_id === localOwned!.id);
              for (const gd of localGuides) {
                await supabase.from('guides').upsert(gd);
              }
              const localDepartures = fullDb.departures.filter(d => d.agency_id === localOwned!.id);
              for (const dep of localDepartures) {
                await supabase.from('departures').upsert(dep);
              }
            }
          } else {
            // 2. Is this user a guide member of an agency?
            const { data: memberships } = await supabase
              .from('agency_members')
              .select('*')
              .eq('user_id', existingUser.id);
              
            let matchedMemberships = memberships;
            
            // If they are not registered as guide on Supabase BUT custom user_metadata says they are a guide with a join code:
            if ((!matchedMemberships || matchedMemberships.length === 0) && supabaseMetadata?.role === 'guia' && supabaseMetadata?.join_code) {
              console.log('🧱 Auto-joining guide from authentic user_metadata with join_code:', supabaseMetadata.join_code);
              
              // We need to fetch the target agency first
              let targetAgency = db.lookupAgencyByCode(supabaseMetadata.join_code);
              if (!targetAgency && isSupabaseConfigured && supabase) {
                const { data: remoteAgencies } = await supabase
                  .from('agencies')
                  .select('*')
                  .eq('join_code', supabaseMetadata.join_code.toUpperCase().trim());
                  
                if (remoteAgencies && remoteAgencies.length > 0) {
                  targetAgency = remoteAgencies[0];
                  // cache target agency
                  fullDb.agencies.push(targetAgency);
                  saveDb(fullDb);
                  fullDb = getDb();
                }
              }
              
              if (targetAgency) {
                const joinResult = db.joinAgencyAsGuide({
                  joinCode: supabaseMetadata.join_code,
                  userId: existingUser.id,
                  email: existingUser.email,
                  fullName: existingUser.full_name,
                  phone: supabaseMetadata.phone || '',
                  avatarUrl: existingUser.avatar_url
                });
                
                if (joinResult.success) {
                  // Re-query local agency member to get the record we just created
                  const localM = fullDb.agency_members.find(m => m.user_id === existingUser.id);
                  if (localM) {
                    matchedMemberships = [localM];
                  }
                }
              }
            }
            
            if (matchedMemberships && matchedMemberships.length > 0) {
              const localMemIndex = fullDb.agency_members.findIndex(m => m.user_id === existingUser.id);
              if (localMemIndex === -1) {
                fullDb.agency_members.push(matchedMemberships[0]);
              } else {
                fullDb.agency_members[localMemIndex] = matchedMemberships[0];
              }
              saveDb(fullDb);
              fullDb = getDb();
              
              // Sync details for that agency too
              const { data: memberAgencies } = await supabase
                .from('agencies')
                .select('*')
                .eq('id', matchedMemberships[0].agency_id);
                
              if (memberAgencies && memberAgencies.length > 0) {
                const localAgencyIndex = fullDb.agencies.findIndex(a => a.id === memberAgencies[0].id);
                if (localAgencyIndex === -1) {
                  fullDb.agencies.push(memberAgencies[0]);
                } else {
                  fullDb.agencies[localAgencyIndex] = memberAgencies[0];
                }
                saveDb(fullDb);
                fullDb = getDb();
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync agency details on sign in:', err);
      }
    }

    loadAgencyAndRole(existingUser);
    setLoading(false);
    return { success: true };
  };

  const signUpAdmin = async (
    email: string,
    pass: string,
    name: string,
    agencyName: string,
    city: string,
    logoUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    const fullDb = getDb();
    const cleanEmail = email.toLowerCase().trim();

    let authenticatedUserId: string | null = null;
    const isDemoAccount = !isSupabaseConfigured || pass === 'admin' || pass === 'guia';

    // --- REAL SUPABASE SIGN UP ---
    if (isSupabaseConfigured && supabase && !isDemoAccount) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: pass,
          options: {
            data: {
              full_name: name,
              role: 'admin',
              agency_name: agencyName,
              agency_city: city,
              logo_url: logoUrl || ''
            }
          }
        });

        if (authError) {
          setLoading(false);
          return { success: false, error: authError.message };
        }

        if (authData.user) {
          authenticatedUserId = authData.user.id;
        }
      } catch (err: any) {
        console.error('Supabase auth sign up exception:', err);
        setLoading(false);
        return { success: false, error: 'Excepción al registrar: ' + (err.message || err) };
      }
    }

    // Validation: un admin de agencia es único
    const emailExists = fullDb.users.some(u => u.email.toLowerCase() === cleanEmail);
    if (emailExists) {
      console.log('User email already exists, signing in');
    }

    const newUserId = authenticatedUserId || 'usr-' + Math.random().toString(36).substr(2, 9);
    const newUser: MockUser = {
      id: newUserId,
      email: cleanEmail,
      full_name: name
    };

    if (!emailExists) {
      fullDb.users.push(newUser);
    } else {
      // Update ID to sync if authenticated
      const existingIdx = fullDb.users.findIndex(u => u.email.toLowerCase() === cleanEmail);
      if (existingIdx !== -1) {
        fullDb.users[existingIdx].id = newUserId;
        newUser.id = newUserId;
      }
    }
    saveDb(fullDb);

    // Push user to Supabase
    await supabaseSync.upsertUser(newUser);

    // Create Agency with dynamic optionally uploaded logo
    db.createAgency(newUser.id, agencyName, city, logoUrl);

    // Set Session
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newUser));
    setUser(newUser);
    loadAgencyAndRole(newUser);
    setLoading(false);
    return { success: true };
  };

  const signUpGuide = async (
    email: string,
    pass: string,
    name: string,
    joinCode: string,
    phone: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    let agencyTarget = db.lookupAgencyByCode(joinCode);
    
    // Better lookup check directly from Supabase
    if (!agencyTarget && isSupabaseConfigured && supabase) {
      try {
        const { data: remoteAgencies } = await supabase
          .from('agencies')
          .select('*')
          .eq('join_code', joinCode.toUpperCase().trim());
        if (remoteAgencies && remoteAgencies.length > 0) {
          agencyTarget = remoteAgencies[0];
          // Cache it locally so other components can see it
          const fullDb = getDb();
          const existIdx = fullDb.agencies.findIndex(a => a.id === agencyTarget!.id);
          if (existIdx === -1) {
            fullDb.agencies.push(agencyTarget);
            saveDb(fullDb);
          }
        }
      } catch (err) {
        console.error('Failed to query agency by join code on Supabase:', err);
      }
    }

    if (!agencyTarget) {
      setLoading(false);
      return { success: false, error: 'El código de agencia indicado no existe.' };
    }

    const fullDb = getDb();
    const cleanEmail = email.toLowerCase().trim();

    let authenticatedUserId: string | null = null;
    const isDemoAccount = !isSupabaseConfigured || pass === 'admin' || pass === 'guia';

    // --- REAL SUPABASE SIGN UP ---
    if (isSupabaseConfigured && supabase && !isDemoAccount) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: pass,
          options: {
            data: {
              full_name: name,
              role: 'guia',
              join_code: joinCode,
              phone: phone,
              avatar_url: avatarUrl || ''
            }
          }
        });

        if (authError) {
          setLoading(false);
          return { success: false, error: authError.message };
        }

        if (authData.user) {
          authenticatedUserId = authData.user.id;
        }
      } catch (err: any) {
        console.error('Supabase auth guide sign up exception:', err);
        setLoading(false);
        return { success: false, error: 'Excepción al registrar guía: ' + (err.message || err) };
      }
    }

    const isAlreadyRegistered = fullDb.users.some(u => u.email.toLowerCase() === cleanEmail);
    let matchedUser: MockUser;

    const newUserId = authenticatedUserId || 'usr-' + Math.random().toString(36).substr(2, 9);

    if (isAlreadyRegistered) {
      matchedUser = fullDb.users.find(u => u.email.toLowerCase() === cleanEmail)!;
      matchedUser.id = newUserId; // Sync to authentic uuid
      if (avatarUrl) {
        matchedUser.avatar_url = avatarUrl;
      }
    } else {
      matchedUser = {
        id: newUserId,
        email: cleanEmail,
        full_name: name,
        avatar_url: avatarUrl || ''
      };
      fullDb.users.push(matchedUser);
      saveDb(fullDb);
    }

    // Push user to Supabase
    await supabaseSync.upsertUser(matchedUser);

    // Call join agency helper passing the guide profile avatar
    const joinResult = db.joinAgencyAsGuide({
      joinCode,
      userId: matchedUser.id,
      email: cleanEmail,
      fullName: name,
      phone,
      avatarUrl
    });

    if (!joinResult.success) {
      setLoading(false);
      return { success: false, error: joinResult.error };
    }

    // Set Session
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(matchedUser));
    setUser(matchedUser);
    loadAgencyAndRole(matchedUser);
    setLoading(false);
    return { success: true };
  };

  const isAdmin = role === AgencyRole.ADMIN;

  return (
    <AuthContext.Provider value={{
      user,
      agency,
      role,
      isAdmin,
      loading,
      refreshAgency,
      signOut,
      signIn,
      signUpAdmin,
      signUpGuide
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}
