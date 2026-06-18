/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { db, isSupabaseConfigured } from './lib/supabaseClient';
import DashboardView from './components/DashboardView';
import ActivitiesView from './components/ActivitiesView';
import GuidesView from './components/GuidesView';
import ReportsView from './components/ReportsView';
import NotificationsCenter from './components/NotificationsCenter';
import { FileUpload } from './components/FileUpload';
import { CityAutocomplete } from './components/CityAutocomplete';
import { PricingModal } from './components/PricingModal';
import { DownloadAppModal } from './components/DownloadAppModal';
import { RiskWaiverSignView } from './components/RiskWaiverSignView';
import { 
  Compass, LayoutDashboard, Compass as ActivitiesIcon, Users, UserSquare2, 
  LineChart, LogOut, Lock, Mail, User, Phone, MapPin, Search, ChevronRight, 
  ArrowLeft, ArrowRight, X, Calendar, Eye, EyeOff, Sparkles, Building, AlertCircle, UserPlus, Settings, UserCheck,
  Smartphone, Tablet
} from 'lucide-react';

function AppContent() {
  const { 
    user, agency, role, isAdmin, loading, signOut, signIn, signUpAdmin, signUpGuide, refreshAgency
  } = useAuth();

  const [supabaseSyncError, setSupabaseSyncErrorState] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Verificar estado de Supabase
    setSupabaseSyncErrorState(!isSupabaseConfigured);
  }, []);

  // Check if this is the dynamic public signature page
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  useEffect(() => {
    const handleHash = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const isFirmaRoute = currentHash.startsWith('#/firma/');
  if (isFirmaRoute) {
    const passengerId = currentHash.replace('#/firma/', '');
    return <RiskWaiverSignView passengerId={passengerId} />;
  }

  // Check if guide is approved
  const [isGuideApproved, setIsGuideApproved] = useState(true);

  useEffect(() => {
    const checkApproval = async () => {
      if (!user) { setIsGuideApproved(true); return; }
      if (role === 'admin') { setIsGuideApproved(true); return; }
      if (role === 'guia' && agency) {
        const guides = await db.getGuides(agency.id);
        const guideProfile = guides.find(g => g.user_id === user.id);
        if (guideProfile) {
          setIsGuideApproved(guideProfile.active);
        } else {
          setIsGuideApproved(false);
        }
      }
    };
    checkApproval();
  }, [user, role, agency]);

  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [forgotEmail, setForgotEmail] = useState('');
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  // Edit Modals and Inputs
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Agency Edit state
  const [editAgencyName, setEditAgencyName] = useState('');
  const [editAgencyCity, setEditAgencyCity] = useState('');
  const [editAgencyLogo, setEditAgencyLogo] = useState('');
  const [editAgencyWspTemplate, setEditAgencyWspTemplate] = useState('');

  // User Profile Edit state
  const [editUserName, setEditUserName] = useState('');
  const [editUserAvatar, setEditUserAvatar] = useState('');

  useEffect(() => {
    if (agency) {
      setEditAgencyName(agency.name || '');
      setEditAgencyCity(agency.city || '');
      setEditAgencyLogo(agency.logo_url || '');
      setEditAgencyWspTemplate(agency.whatsapp_template || '');
    }
  }, [agency]);

  useEffect(() => {
    if (user) {
      setEditUserName(user.full_name || '');
      setEditUserAvatar(user.avatar_url || '');
    }
  }, [user]);

  useEffect(() => {
    const handleOpenPricing = () => setIsPricingModalOpen(true);
    const handleOpenDownload = () => setIsDownloadModalOpen(true);
    window.addEventListener('rumbo_open_pricing', handleOpenPricing);
    window.addEventListener('rumbo_open_download', handleOpenDownload);
    return () => {
      window.removeEventListener('rumbo_open_pricing', handleOpenPricing);
      window.removeEventListener('rumbo_open_download', handleOpenDownload);
    };
  }, []);

  const handleSaveAgency = async () => {
    if (!agency) return;
    await db.updateAgency(agency.id, {
      name: editAgencyName,
      city: editAgencyCity,
      logo_url: editAgencyLogo,
      whatsapp_template: editAgencyWspTemplate
    });
    refreshAgency();
    setIsAgencyModalOpen(false);
  };

  const handleSaveUserProfile = async () => {
    if (!user || !supabase) return;

    await supabase.from('users').update({
      full_name: editUserName,
      avatar_url: editUserAvatar
    }).eq('id', user.id);

    // También actualizar guía si existe
    if (agency) {
      const guides = await db.getGuides(agency.id);
      const myGuide = guides.find(g => g.user_id === user.id);
      if (myGuide) {
        await db.updateGuide(myGuide.id, {
          full_name: editUserName,
          avatar_url: editUserAvatar
        });
      }
    }

    refreshAgency();
    setIsProfileModalOpen(false);
    window.location.reload();
  };

  // Authentication Screen Substates
  const [authView, setAuthView] = useState<'login' | 'register' | 'join-guide' | 'forgot' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [city, setCity] = useState('Pucón, La Araucanía');
  const [phone, setPhone] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [registerLogo, setRegisterLogo] = useState('');
  const [registerAvatar, setRegisterAvatar] = useState('');
  const [previewAgency, setPreviewAgency] = useState<any>(null);

  const [resetPasswordState, setResetPasswordState] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/register') { setAuthView('register'); }
      else if (hash === '#/join-guide') { setAuthView('join-guide'); }
      else if (hash === '#/forgot-password') { setAuthView('forgot'); }
      else if (hash.startsWith('#/reset-password')) { setAuthView('reset'); }
      else if (hash === '#/login') { setAuthView('login'); }
      else if (user && agency) {
        const tab = hash.replace('#/', '');
        const validTabs = ['dashboard', 'activities', 'guides', 'reports'];
        if (validTabs.includes(tab)) {
          if (!isAdmin && tab === 'reports') {
            setActiveTab('dashboard');
            navigateToHash('#/dashboard');
          } else {
            setActiveTab(tab);
          }
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, agency, isAdmin]);

  useEffect(() => {
    if (joinCode.length >= 4) {
      db.lookupAgencyByCode(joinCode).then(target => setPreviewAgency(target));
    } else {
      setPreviewAgency(null);
    }
  }, [joinCode]);

  const navigateToHash = (newHash: string) => {
    window.location.hash = newHash;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Por favor ingresa correo y contraseña.');
      return;
    }
    const res = await signIn(email, password);
    if (res.success) {
      navigateToHash('#/dashboard');
    } else {
      alert(res.error || 'Error al iniciar sesión.');
    }
  };

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !agencyName || !city) {
      alert('Por favor completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    const res = await signUpAdmin(email, password, fullName, agencyName, city, registerLogo);
    if (res.success) {
      navigateToHash('#/dashboard');
    } else {
      alert(res.error || 'Error al registrar.');
    }
  };

  const handleGuideRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !joinCode || !phone) {
      alert('Por favor completa todos los campos.');
      return;
    }
    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    const res = await signUpGuide(email, password, fullName, joinCode, phone, registerAvatar);
    if (res.success) {
      navigateToHash('#/dashboard');
    } else {
      alert(res.error);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);
      if (error) {
        alert('Error: ' + error.message);
      } else {
        setPasswordResetSent(true);
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordState || resetPasswordState.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (supabase) {
      const { error } = await supabase.auth.updateUser({ password: resetPasswordState });
      if (error) {
        alert('Error: ' + error.message);
      } else {
        alert('Contraseña actualizada con éxito.');
        setAuthView('login');
        navigateToHash('#/login');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8F1F7] flex flex-col items-center justify-center font-sans">
        <Compass className="w-12 h-12 text-[#1F4D3A] animate-spin mb-4" />
        <h2 className="text-pine font-display font-semibold text-lg">Iniciando Rumbo...</h2>
        <p className="text-xs text-gray-500 mt-1">Conectando con Supabase...</p>
      </div>
    );
  }

  // 1. PUBLIC AUTHENTICATION SCREENS
  if (!user) {
    return (
      <div className="w-full min-h-screen bg-[#1F4D3A] font-sans flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#0F6BA8]/10 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-150 relative z-10">
          <div className="text-center mb-6 border-b border-gray-100 pb-5">
            <div className="w-12 h-12 bg-[#1F4D3A] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-display font-black text-[#1F4D3A] tracking-tight">Rumbo</h1>
            <p className="text-[10px] text-[#0F6BA8] font-bold tracking-wider uppercase mt-1">Gestión & Logística de Aventura</p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <strong>⚠️ Configuración pendiente:</strong> Necesitas agregar <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en tu archivo <code>.env</code> o configuración de Vercel.
            </div>
          )}

          <div className="w-full">
            {authView === 'login' && (
              <div className="flex flex-col gap-5 text-left">
                <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Correo electrónico:</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input type="email" required placeholder="ejemplo@rumbo.com" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pl-10 text-xs bg-white outline-none focus:ring-2 focus:ring-pine/30" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <label className="text-xs font-semibold text-gray-700">Contraseña:</label>
                      <button type="button" onClick={() => { setAuthView('forgot'); navigateToHash('#/forgot-password'); }}
                        className="text-[11px] text-[#0F6BA8] hover:underline cursor-pointer font-bold">¿Olvidaste tu clave?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input type={showPassword ? 'text' : 'password'} required placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pl-10 text-xs bg-white outline-none focus:ring-2 focus:ring-pine/30" />
                    </div>
                    <p className="text-[10px] text-gray-400">La contraseña debe tener al menos 6 caracteres.</p>
                  </div>
                  <button type="submit" className="w-full py-3 bg-pine hover:bg-pine/90 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all">
                    Iniciar Sesión
                  </button>
                </form>

                <div className="border-t border-gray-100 pt-3 flex flex-col gap-2 text-center text-xs text-slate-500">
                  <p>¿Quieres registrar una nueva agencia? <button onClick={() => { setAuthView('register'); navigateToHash('#/register'); }}
                    className="font-bold text-pine hover:underline cursor-pointer">Registrar Agencia</button></p>
                  <p>¿Eres un guía? <button onClick={() => { setAuthView('join-guide'); navigateToHash('#/join-guide'); }}
                    className="font-bold text-[#0F6BA8] hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto mt-1">
                    <UserPlus className="w-4 h-4" /> Unirme como Guía</button></p>
                </div>
              </div>
            )}

            {authView === 'register' && (
              <div className="flex flex-col gap-5 text-left">
                <button onClick={() => { setAuthView('login'); navigateToHash('#/login'); }}
                  className="text-xs text-gray-400 hover:text-pine font-medium flex items-center gap-1 cursor-pointer mb-2">
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver al portal
                </button>
                <h3 className="font-display font-semibold text-2xl text-pine">Registrar tu Agencia</h3>
                <p className="text-xs text-gray-500">Crea tu cuenta y da de alta tu agencia.</p>

                <form onSubmit={handleAdminRegister} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre completo:</label>
                    <input type="text" required placeholder="Tu nombre" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre de la Agencia:</label>
                      <input type="text" required placeholder="Rumbo Aventura" value={agencyName} onChange={(e) => setAgencyName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Ciudad Base:</label>
                      <CityAutocomplete value={city} onChange={(val) => setCity(val)} placeholder="Busca localidad..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Logo:</label>
                    <FileUpload onUpload={(base64) => setRegisterLogo(base64)} currentUrl={registerLogo} placeholderText="Arrastra el logo o haz clic" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Correo:</label>
                    <input type="email" required placeholder="admin@tuagencia.com" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Contraseña (mín. 6):</label>
                    <input type="password" required minLength={6} placeholder="******" value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
                  </div>
                  <button type="submit" className="w-full py-3 bg-[#1F4D3A] hover:bg-[#173b2c] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">
                    Crear Agencia & Cuenta
                  </button>
                </form>
              </div>
            )}

            {authView === 'join-guide' && (
              <div className="flex flex-col gap-5 text-left">
                <button onClick={() => { setAuthView('login'); navigateToHash('#/login'); }}
                  className="text-xs text-gray-400 hover:text-pine font-medium flex items-center gap-1 cursor-pointer mb-2">
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver
                </button>
                <h3 className="font-display font-semibold text-2xl text-pine">Unirme como Guía</h3>
                <p className="text-xs text-gray-500">Usa el código corporativo de tu agencia.</p>

                <form onSubmit={handleGuideRegister} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Código (8 dígitos):</label>
                    <input type="text" maxLength={8} required placeholder="RUMBOPAT" value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 font-mono text-center text-sm font-bold bg-[#E8F1F7]/30 text-pine outline-none focus:ring-2 focus:ring-pine/30" />
                    {previewAgency ? (
                      <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2 items-center text-xs">
                        <img src={previewAgency.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover" />
                        <div><p className="font-bold">✅ {previewAgency.name}</p><p className="text-gray-500">{previewAgency.city}</p></div>
                      </div>
                    ) : joinCode.length >= 4 && (
                      <p className="text-[10px] text-red-500 mt-1">Buscando agencia... Ingresa un código válido</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre:</label>
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Foto de Perfil:</label>
                    <FileUpload onUpload={(base64) => setRegisterAvatar(base64)} currentUrl={registerAvatar} placeholderText="Arrastra foto o haz clic" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Celular:</label>
                      <input type="tel" required placeholder="+56912345678" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Correo:</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Contraseña (mín. 6):</label>
                    <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
                  </div>
                  <button type="submit" className="w-full py-3 bg-ocean hover:bg-[#0c598c] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">
                    Completar Enlace
                  </button>
                </form>
              </div>
            )}

            {authView === 'forgot' && (
              <div className="flex flex-col gap-5 text-left">
                <button onClick={() => { setAuthView('login'); navigateToHash('#/login'); }}
                  className="text-xs text-gray-400 hover:text-pine font-medium flex items-center gap-1 cursor-pointer mb-2">
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver
                </button>
                <h3 className="font-display font-semibold text-2xl text-pine">Recuperar Contraseña</h3>
                <p className="text-xs text-gray-500">Ingresa tu email para recibir un enlace.</p>

                {passwordResetSent ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-emerald-800 text-xs text-center">
                    <span className="text-2xl">✉️</span>
                    <strong>¡Enlace enviado!</strong>
                    <p>Revisa tu correo <strong>{forgotEmail}</strong> para restablecer.</p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                    <input type="email" required placeholder="tu@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
                    <button type="submit" className="w-full py-3 bg-pine text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">
                      Enviar Enlace de Recuperación
                    </button>
                  </form>
                )}
              </div>
            )}

            {authView === 'reset' && (
              <div className="flex flex-col gap-5 text-left">
                <h3 className="font-display font-semibold text-2xl text-pine">Nueva Contraseña</h3>
                <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                  <input type="password" required minLength={6} placeholder="Mínimo 6 caracteres" value={resetPasswordState} onChange={(e) => setResetPasswordState(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none" />
                  <button type="submit" className="w-full py-3 bg-pine text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">
                    Actualizar Contraseña
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. LOGGED IN WITHOUT AGENCY
  if (!agency) {
    return (
      <div className="min-h-screen bg-[#E8F1F7] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <Building className="w-12 h-12 text-[#1F4D3A] mx-auto mb-3" />
            <h2 className="text-2xl font-display font-bold text-pine">Sin Agencia asignada</h2>
            <p className="text-xs text-gray-500 mt-1">Crea una agencia o únete a una existente.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => { signOut(); setAuthView('register'); navigateToHash('#/register'); }}
              className="w-full py-3 bg-pine text-white rounded-xl text-xs font-bold">🏢 Crear Agencia</button>
            <button onClick={() => { signOut(); setAuthView('join-guide'); navigateToHash('#/join-guide'); }}
              className="w-full py-3 bg-ocean text-white rounded-xl text-xs font-bold">🧭 Unirme como Guía</button>
          </div>
          <button onClick={signOut} className="w-full py-2.5 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold mt-4">
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // 2.2 GUIDE NOT APPROVED
  if (!isGuideApproved) {
    return (
      <div className="min-h-screen bg-[#E8F1F7] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-bold text-pine">Esperando confirmación</h2>
          <p className="text-xs text-gray-500 mt-2">Tu solicitud para <strong>{agency.name}</strong> está en revisión.</p>
          <button onClick={signOut} className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-semibold mt-6">
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // 3. MAIN APP SHELL
  return (
    <div className="min-h-screen bg-[#E8F1F7]/40 flex flex-col md:flex-row font-sans">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex md:w-64 bg-pine text-white flex-col justify-between p-5 border-r border-[#1F4D3A] shrink-0">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-black text-lg tracking-wider block">Rumbo</span>
              <span className="text-[10px] text-[#E8F1F7]/60 font-bold block uppercase tracking-widest">Aventura</span>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            <button onClick={() => { setActiveTab('dashboard'); navigateToHash('#/dashboard'); }}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${activeTab === 'dashboard' ? 'bg-white/12 text-white font-bold' : 'text-white/70 hover:bg-white/5'}`}>
              <LayoutDashboard className="w-4 h-4" /> Operaciones Diarias
            </button>
            <button onClick={() => { setActiveTab('activities'); navigateToHash('#/activities'); }}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${activeTab === 'activities' ? 'bg-white/12 text-white font-bold' : 'text-white/70 hover:bg-white/5'}`}>
              <ActivitiesIcon className="w-4 h-4" /> Catálogo Actividades
            </button>
            <button onClick={() => { setActiveTab('guides'); navigateToHash('#/guides'); }}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${activeTab === 'guides' ? 'bg-white/12 text-white font-bold' : 'text-white/70 hover:bg-white/5'}`}>
              <Users className="w-4 h-4" /> Equipo de Guías
            </button>
            {isAdmin && (
              <button onClick={() => { setActiveTab('reports'); navigateToHash('#/reports'); }}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${activeTab === 'reports' ? 'bg-white/12 text-white font-bold' : 'text-white/70 hover:bg-white/5'}`}>
                <LineChart className="w-4 h-4" /> Métricas / Reportes
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setIsPricingModalOpen(true)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer text-white/70 hover:bg-white/5">
                <Sparkles className="w-4 h-4 text-amber-400" /> Planes y Suscripción
              </button>
            )}
            <button onClick={() => setIsDownloadModalOpen(true)}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer text-emerald-400 hover:bg-white/5">
              <Smartphone className="w-4 h-4" /> Descargar App
            </button>
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-4">
          <div onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-2.5 hover:bg-white/5 p-1.5 rounded-xl cursor-pointer transition-colors">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-lg object-cover border border-white/15" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs text-white">
                {user.full_name?.substr(0, 2).toUpperCase() || 'US'}
              </div>
            )}
            <div className="truncate text-left">
              <p className="text-xs font-bold text-white flex items-center gap-1">{user.full_name}<UserCheck className="w-3 h-3 text-[#58A6FF]" /></p>
              <span className="text-[10px] text-[#E8F1F7]/60 block">{isAdmin ? '👑 Administrador' : '🧭 Guía'}</span>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center justify-center gap-2 py-2 px-3 bg-white/5 hover:bg-red-900/40 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-pine text-white md:bg-white md:text-gray-900 border-b border-gray-100 p-4 px-5 flex items-center justify-between z-30">
          <div className="flex items-center gap-2.5 md:hidden">
            <img src={agency.logo_url} alt={agency.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
            <div className="leading-tight">
              <span className="font-bold text-xs block text-white truncate max-w-[160px]">{agency.name}</span>
              <span className="text-[9px] text-white/70">{isAdmin ? '👑 Admin' : '🧭 Guía'}</span>
            </div>
          </div>

          <div onClick={() => isAdmin && setIsAgencyModalOpen(true)} 
            className={`hidden md:flex items-center gap-3.5 p-1.5 rounded-2xl transition-colors ${isAdmin ? 'hover:bg-gray-50 cursor-pointer' : ''}`}>
            <img src={agency.logo_url} alt={agency.name} className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
            <div className="text-left">
              <p className="text-sm font-semibold text-pine font-display">{agency.name} {isAdmin && <Settings className="w-3.5 h-3.5 inline text-pine/60" />}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-gray-400">Código: <strong className="font-mono">{agency.join_code}</strong></span>
                <button onClick={(e) => { e.stopPropagation(); setIsPricingModalOpen(true); }}
                  className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border">
                  {agency.subscription_plan || 'free'}
                </button>
              </div>
            </div>
            {isSupabaseConfigured ? (
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full font-bold border border-emerald-150 ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sincronizado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full font-bold border border-amber-200 ml-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Sin Configurar
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <NotificationsCenter agencyId={agency.id} />
            <button onClick={signOut} className="md:hidden p-2 text-white hover:bg-white/10 rounded-full">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-6 pb-24 md:pb-8">
          {activeTab === 'dashboard' && <DashboardView onNavigate={(h) => navigateToHash(h)} />}
          {activeTab === 'activities' && <ActivitiesView />}
          {activeTab === 'guides' && <GuidesView />}
          {activeTab === 'reports' && <ReportsView />}
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-150 z-40 flex items-center justify-around p-2.5 md:hidden">
        <button onClick={() => { setActiveTab('dashboard'); navigateToHash('#/dashboard'); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${activeTab === 'dashboard' ? 'text-pine' : 'text-gray-400'}`}>
          <LayoutDashboard className="w-4.5 h-4.5" /> Operaciones
        </button>
        <button onClick={() => { setActiveTab('activities'); navigateToHash('#/activities'); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${activeTab === 'activities' ? 'text-pine' : 'text-gray-400'}`}>
          <ActivitiesIcon className="w-4.5 h-4.5" /> Catálogo
        </button>
        <button onClick={() => { setActiveTab('guides'); navigateToHash('#/guides'); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${activeTab === 'guides' ? 'text-pine' : 'text-gray-400'}`}>
          <Users className="w-4.5 h-4.5" /> Guías
        </button>
        {isAdmin && (
          <button onClick={() => { setActiveTab('reports'); navigateToHash('#/reports'); }}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${activeTab === 'reports' ? 'text-[#1F4D3A]' : 'text-gray-400'}`}>
            <LineChart className="w-4.5 h-4.5" /> Métricas
          </button>
        )}
      </nav>

      {/* MODALS */}
      {isAgencyModalOpen && agency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setIsAgencyModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10">
            <h3 className="font-display font-semibold text-lg text-pine mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Building className="w-5 h-5" /> Editar Agencia
            </h3>
            <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre:</label>
                <input type="text" value={editAgencyName} onChange={(e) => setEditAgencyName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Ciudad:</label>
                <CityAutocomplete value={editAgencyCity} onChange={(val) => setEditAgencyCity(val)} placeholder="Busca ciudad..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Logo:</label>
                <FileUpload onUpload={(base64) => setEditAgencyLogo(base64)} currentUrl={editAgencyLogo} placeholderText="Arrastra logo o haz clic" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Plantilla WhatsApp:</label>
                <textarea value={editAgencyWspTemplate} onChange={(e) => setEditAgencyWspTemplate(e.target.value)}
                  placeholder="Hola {pasajero}, te recordamos..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs h-24 outline-none focus:ring-2 focus:ring-pine/30" />
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-50 pt-4">
                <button onClick={() => setIsAgencyModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl">Cancelar</button>
                <button onClick={handleSaveAgency} className="px-4 py-2 bg-pine text-white text-xs font-bold rounded-xl">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProfileModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setIsProfileModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl z-10">
            <h3 className="font-display font-semibold text-lg text-pine mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <User className="w-5 h-5" /> Editar Perfil
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre:</label>
                <input type="text" value={editUserName} onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-pine/30" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Email (no editable):</label>
                <input type="text" disabled value={user.email} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 text-gray-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Avatar:</label>
                <FileUpload onUpload={(base64) => setEditUserAvatar(base64)} currentUrl={editUserAvatar} placeholderText="Arrastra foto o haz clic" />
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-50 pt-4">
                <button onClick={() => setIsProfileModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl">Cancelar</button>
                <button onClick={handleSaveUserProfile} className="px-4 py-2 bg-pine text-white text-xs font-bold rounded-xl">Actualizar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
      <DownloadAppModal isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
