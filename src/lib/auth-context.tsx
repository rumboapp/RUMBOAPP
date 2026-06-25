/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Agency, AgencyRole, MockUser, AuthContextType } from '../types';
import { supabase, isSupabaseConfigured, getSupabaseErrorMessage } from './supabaseClient';
import { setDemoMode } from './db';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [role, setRole] = useState<AgencyRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Cargar sesión real de Supabase + datos del usuario
  const loadSession = async () => {
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      // 1. Obtener sesión actual de Supabase Auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setUser(null);
        setAgency(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const authUser = session.user;

      // 2. Buscar/crear perfil en public.users
      let { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Si no existe el perfil, crearlo (el trigger debería hacerlo, pero por si acaso)
      if (!userProfile) {
        const newUser = {
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '',
          avatar_url: authUser.user_metadata?.avatar_url || ''
        };

        await supabase.from('users').upsert(newUser);
        userProfile = newUser;
      }

      const mockUser: MockUser = {
        id: authUser.id,
        email: authUser.email || '',
        full_name: userProfile?.full_name || authUser.user_metadata?.full_name || '',
        avatar_url: userProfile?.avatar_url || authUser.user_metadata?.avatar_url || ''
      };

      setUser(mockUser);

      // 3. Buscar agencia y rol
      await loadAgencyAndRole(mockUser);

    } catch (err) {
      console.error('Error cargando sesión:', err);
      setUser(null);
      setAgency(null);
      setRole(null);
    }

    setLoading(false);
  };

  const loadAgencyAndRole = async (currentUser: MockUser) => {
    if (!isSupabaseConfigured || !supabase) return;

    try {
      // ¿Es dueño de una agencia?
      const { data: ownedAgencies } = await supabase
        .from('agencies')
        .select('*')
        .eq('owner_id', currentUser.id)
        .limit(1);

      if (ownedAgencies && ownedAgencies.length > 0) {
        const ownedAgency = ownedAgencies[0] as Agency;
        setAgency(ownedAgency);
        setRole(AgencyRole.ADMIN);
        setIsDemoMode(!!ownedAgency.is_demo);
        setDemoMode(!!ownedAgency.is_demo);
        return;
      }

      // ¿Es miembro (guía) de una agencia?
      const { data: memberships } = await supabase
        .from('agency_members')
        .select('*, agencies(*)')
        .eq('user_id', currentUser.id)
        .limit(1);

      if (memberships && memberships.length > 0) {
        const membership = memberships[0];
        const memberAgency = membership.agencies as Agency;
        setAgency(memberAgency);
        setRole(membership.role as AgencyRole);
        setIsDemoMode(!!memberAgency.is_demo);
        setDemoMode(!!memberAgency.is_demo);
        return;
      }

      setAgency(null);
      setRole(null);
      setIsDemoMode(false);
      setDemoMode(false);
    } catch (err) {
      console.error('Error cargando agencia:', err);
      setAgency(null);
      setRole(null);
      setIsDemoMode(false);
      setDemoMode(false);
    }
  };

  useEffect(() => {
    // Safety timer to prevent eternal loading screen if Supabase queries stay pending
    const timer = setTimeout(() => {
      setLoading(false);
      console.warn('Carga de sesión excedió el límite de seguridad. Forzando pasaje.');
    }, 4000);

    loadSession().finally(() => {
      clearTimeout(timer);
    });

    // Escuchar cambios de autenticación en tiempo real
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              await loadSession();
            }
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setAgency(null);
            setRole(null);
            setIsDemoMode(false);
            setDemoMode(false);
          }
        }
      );

      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setAgency(null);
    setRole(null);
    setIsDemoMode(false);
    setDemoMode(false);
    setLoading(false);
  };

  const signIn = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase no está configurado. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.' };
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: pass
      });

      if (error) {
        setLoading(false);
        return { success: false, error: getSupabaseErrorMessage(error) };
      }

      if (data.user) {
        await loadSession();
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: 'No se pudo iniciar sesión.' };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: 'Error de conexión: ' + (err.message || err) };
    }
  };

  const signUpAdmin = async (
    email: string,
    pass: string,
    name: string,
    agencyName: string,
    city: string,
    logoUrl?: string
  ): Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean; message?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase no está configurado.' };
    }

    if (!email || !pass || !name || !agencyName || !city) {
      return { success: false, error: 'Por favor completa todos los campos.' };
    }

    if (pass.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    setLoading(true);

    try {
      // 1. Registrar en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: pass,
        options: {
          emailRedirectTo: `${window.location.origin}/#/login`,
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
        return { success: false, error: getSupabaseErrorMessage(authError) };
      }

      if (!authData.user) {
        setLoading(false);
        return { success: false, error: 'No se pudo crear el usuario.' };
      }

      const userId = authData.user.id;
      const emailConfirmationRequired = !authData.session;

      // 2-5. Crear perfil, agencia y notificación de bienvenida vía función
      // RPC con privilegios elevados: funciona aunque todavía no exista
      // sesión (email sin confirmar) y no depende de RLS, igual que
      // complete_guide_signup para el flujo de guías.
      const { getCoordinatesForCity } = await import('./cities');
      const coords = getCoordinatesForCity(city);

      const { error: rpcError } = await supabase.rpc('complete_admin_signup', {
        p_user_id: userId,
        p_email: email.toLowerCase().trim(),
        p_full_name: name,
        p_agency_name: agencyName,
        p_city: city,
        p_latitude: coords.latitude,
        p_longitude: coords.longitude,
        p_logo_url: logoUrl || ''
      });

      if (rpcError) {
        console.error('Error completando registro de agencia:', rpcError);
        setLoading(false);
        return {
          success: false,
          error: `Error al registrar tu agencia: ${rpcError.message}`
        };
      }

      if (emailConfirmationRequired) {
        setLoading(false);
        return {
          success: true,
          requiresConfirmation: true,
          message: `Te enviamos un correo a ${email.toLowerCase().trim()}. Haz clic en el enlace para activar tu cuenta antes de iniciar sesión.`
        };
      }

      // 6. Recargar sesión para obtener todo actualizado
      await loadSession();
      setLoading(false);
      return { success: true };

    } catch (err: any) {
      setLoading(false);
      return { success: false, error: 'Error: ' + (err.message || err) };
    }
  };

  const signUpGuide = async (
    email: string,
    pass: string,
    name: string,
    joinCode: string,
    phone: string,
    avatarUrl?: string
  ): Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean; message?: string }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase no está configurado.' };
    }

    if (!email || !pass || !name || !joinCode || !phone) {
      return { success: false, error: 'Por favor completa todos los campos.' };
    }

    if (pass.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    setLoading(true);

    try {
      // 1. Buscar la agencia por código
      const { data: agencies } = await supabase
        .from('agencies')
        .select('*')
        .eq('join_code', joinCode.toUpperCase().trim())
        .limit(1);

      if (!agencies || agencies.length === 0) {
        setLoading(false);
        return { success: false, error: 'El código de agencia no existe. Verifica e intenta de nuevo.' };
      }

      const targetAgency = agencies[0];

      // 2. Registrar en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password: pass,
        options: {
          emailRedirectTo: `${window.location.origin}/#/login`,
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
        return { success: false, error: getSupabaseErrorMessage(authError) };
      }

      if (!authData.user) {
        setLoading(false);
        return { success: false, error: 'No se pudo crear el usuario.' };
      }

      const userId = authData.user.id;
      const emailConfirmationRequired = !authData.session;

      // 3. El trigger on_auth_user_created ya crea el perfil en public.users con
      // privilegios elevados (SECURITY DEFINER). Esperamos un momento y luego
      // intentamos un upsert best-effort, sin bloquear el registro si falla por RLS.
      await new Promise(r => setTimeout(r, 600));

      const { error: userError } = await supabase.from('users').upsert({
        id: userId,
        email: email.toLowerCase().trim(),
        full_name: name,
        avatar_url: avatarUrl || ''
      });

      if (userError) {
        console.warn('No se pudo actualizar el perfil en users (el trigger ya debería haberlo creado):', userError);
      }

      // 5-7. Crear membresía, ficha de guía y notificación al admin
      // vía función RPC con privilegios elevados: funciona aunque
      // todavía no exista sesión (email sin confirmar) y no depende de RLS.
      const { error: rpcError } = await supabase.rpc('complete_guide_signup', {
        p_user_id: userId,
        p_join_code: joinCode,
        p_full_name: name,
        p_phone: phone,
        p_email: email.toLowerCase().trim(),
        p_avatar_url: avatarUrl || ''
      });

      if (rpcError) {
        console.error('Error completando registro de guía:', rpcError);
        setLoading(false);
        return {
          success: false,
          error: `Error al unir el usuario con la agencia: ${rpcError.message}`
        };
      }

      if (emailConfirmationRequired) {
        setLoading(false);
        return {
          success: true,
          requiresConfirmation: true,
          message: `Te enviamos un correo a ${email.toLowerCase().trim()}. Haz clic en el enlace para activar tu cuenta antes de iniciar sesión.`
        };
      }

      await loadSession();
      setLoading(false);
      return { success: true };

    } catch (err: any) {
      setLoading(false);
      return { success: false, error: 'Error: ' + (err.message || err) };
    }
  };

  const refreshAgency = async () => {
    if (user) {
      await loadAgencyAndRole(user);
    }
  };

  const isAdmin = role === AgencyRole.ADMIN;

  return (
    <AuthContext.Provider value={{
      user,
      agency,
      role,
      isAdmin,
      loading,
      isDemoMode,
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
