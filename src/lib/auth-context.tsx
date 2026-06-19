/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Agency, AgencyRole, MockUser, AuthContextType } from '../types';
import { supabase, isSupabaseConfigured, getSupabaseErrorMessage } from './supabaseClient';

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
        setAgency(ownedAgencies[0] as Agency);
        setRole(AgencyRole.ADMIN);
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
        setAgency(membership.agencies as Agency);
        setRole(membership.role as AgencyRole);
        return;
      }

      setAgency(null);
      setRole(null);
    } catch (err) {
      console.error('Error cargando agencia:', err);
      setAgency(null);
      setRole(null);
    }
  };

  useEffect(() => {
    loadSession();

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
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
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

      // 2. El trigger o la base de datos deberían crear el perfil, pero esperamos un momento
      await new Promise(r => setTimeout(r, 600));

      // 3. Crear o actualizar el perfil en public.users con upsert
      const { error: userError } = await supabase.from('users').upsert({
        id: userId,
        email: email.toLowerCase().trim(),
        full_name: name,
        avatar_url: logoUrl || ''
      });

      if (userError) {
        console.error('Error creando perfil en users:', userError);
        if (emailConfirmationRequired) {
          setLoading(false);
          return {
            success: true,
            requiresConfirmation: true,
            message: '¡Registro completado! Supabase requiere confirmación por correo. Por favor, revisa tu bandeja de entrada para verificar tu correo electrónico antes de iniciar sesión.'
          };
        }
        setLoading(false);
        return { 
          success: false, 
          error: `Error al crear tu perfil en la base de datos: ${userError.message}. Asegúrate de haber ejecutado todo el código de /supabase_schema.sql en el SQL Editor de tu panel de Supabase.` 
        };
      }

      // 4. Crear la agencia
      const joinCode = agencyName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() + 
                       Math.floor(1000 + Math.random() * 9000);

      const { getCoordinatesForCity } = await import('./cities');
      const coords = getCoordinatesForCity(city);

      const newAgency = {
        id: 'agc-' + Math.random().toString(36).substr(2, 9),
        owner_id: userId,
        name: agencyName,
        join_code: joinCode,
        logo_url: logoUrl || 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=150',
        city: city,
        latitude: coords.latitude,
        longitude: coords.longitude,
        subscription_plan: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: agencyError } = await supabase.from('agencies').insert(newAgency);

      if (agencyError) {
        console.error('Error creando agencia:', agencyError);
        setLoading(false);
        return {
          success: false,
          error: `Error al registrar tu agencia en la tabla 'agencies': ${agencyError.message}. Verifica que ejecutaras el script de /supabase_schema.sql.`
        };
      }

      // 5. Crear notificación de bienvenida
      const { error: notifError } = await supabase.from('notifications').insert({
        id: 'not-' + Math.random().toString(36).substr(2, 9),
        agency_id: newAgency.id,
        kind: 'system',
        title: '¡Bienvenido a Rumbo!',
        message: `Tu agencia ${agencyName} ha sido creada. Código de guías: ${joinCode}`,
        read: false,
        created_at: new Date().toISOString()
      });

      if (notifError) {
        console.warn('Advertencia al insertar notificación inicial:', notifError);
      }

      if (emailConfirmationRequired) {
        setLoading(false);
        return {
          success: true,
          requiresConfirmation: true,
          message: '¡Registro completado e inicializado! Se requiere confirmación por correo. Revisa tu email para activar la cuenta antes de iniciar sesión y configurar tu panel.'
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

      // 3. Esperar que la base de datos procese el usuario
      await new Promise(r => setTimeout(r, 600));

      // 4. Crear o actualizar perfil en public.users con upsert
      const { error: userError } = await supabase.from('users').upsert({
        id: userId,
        email: email.toLowerCase().trim(),
        full_name: name,
        avatar_url: avatarUrl || ''
      });

      if (userError) {
        console.error('Error creando perfil en users para guía:', userError);
        if (emailConfirmationRequired) {
          setLoading(false);
          return {
            success: true,
            requiresConfirmation: true,
            message: '¡Registro exitoso! Requiere confirmación por correo electrónico. Hemos enviado un correo para verificar tu cuenta. Confírmala antes de iniciar sesión.'
          };
        }
        setLoading(false);
        return {
          success: false,
          error: `Error al registrar tu perfil en la base de datos: ${userError.message}. Verifica que hayas ejecutado el script de /supabase_schema.sql.`
        };
      }

      // 5. Crear membresía (pendiente de aprobación)
      const memberId = 'mem-' + Math.random().toString(36).substr(2, 9);
      const { error: memberError } = await supabase.from('agency_members').insert({
        id: memberId,
        agency_id: targetAgency.id,
        user_id: userId,
        role: AgencyRole.GUIA,
        created_at: new Date().toISOString()
      });

      if (memberError) {
        console.error('Error insertando miembro de agencia:', memberError);
        setLoading(false);
        return {
          success: false,
          error: `Error al unir el usuario con la agencia: ${memberError.message}`
        };
      }

      // 6. Crear perfil de guía (inactivo hasta aprobación)
      const { error: guideError } = await supabase.from('guides').insert({
        id: 'gd-' + Math.random().toString(36).substr(2, 9),
        agency_id: targetAgency.id,
        user_id: userId,
        full_name: name,
        phone: phone,
        email: email.toLowerCase().trim(),
        specialties: ['Turismo general'],
        active: false,
        avatar_url: avatarUrl || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (guideError) {
        console.error('Error creando perfil de guía:', guideError);
        setLoading(false);
        return {
          success: false,
          error: `Error al inicializar la ficha de guía: ${guideError.message}`
        };
      }

      // 7. Notificar al admin
      const { error: notifError } = await supabase.from('notifications').insert({
        id: 'not-' + Math.random().toString(36).substr(2, 9),
        agency_id: targetAgency.id,
        kind: 'system',
        title: 'Nueva solicitud de guía',
        message: `${name} solicitó unirse a tu agencia. Requiere aprobación en el panel de Guías.`,
        read: false,
        created_at: new Date().toISOString()
      });

      if (notifError) {
        console.warn('Advertencia al crear notificación para admin:', notifError);
      }

      if (emailConfirmationRequired) {
        setLoading(false);
        return {
          success: true,
          requiresConfirmation: true,
          message: '¡Registro de guía exitoso! Hemos enviado un enlace de confirmación a tu correo. Revisa tu email para confirmar y activar la cuenta antes de iniciar sesión.'
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
