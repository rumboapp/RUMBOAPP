/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { db, getDb, saveDb, supabaseSync, resetDbToDemo } from './lib/db';
import { isSupabaseConfigured, isSupabaseSyncError, supabaseUrl } from './lib/supabaseClient';
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

  const [supabaseSyncError, setSupabaseSyncErrorState] = useState(isSupabaseSyncError);

  useEffect(() => {
    const handleSyncStatus = () => {
      setSupabaseSyncErrorState(isSupabaseSyncError);
    };
    window.addEventListener('rumbo_db_updated', handleSyncStatus);
    return () => window.removeEventListener('rumbo_db_updated', handleSyncStatus);
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
    const checkApproval = () => {
      if (!user) {
        setIsGuideApproved(true);
        return;
      }
      if (role === 'admin') {
        setIsGuideApproved(true);
        return;
      }
      if (role === 'guia') {
        const fullDb = getDb();
        const guideProfile = fullDb.guides.find(g => g.user_id === user.id);
        if (guideProfile) {
          setIsGuideApproved(guideProfile.active);
        } else {
          // If no guide profile was created yet, consider it pending
          setIsGuideApproved(false);
        }
      }
    };

    checkApproval();
    window.addEventListener('rumbo_db_updated', checkApproval);
    return () => window.removeEventListener('rumbo_db_updated', checkApproval);
  }, [user, role]);

  // Navigation: We use URL hash router or tab state fallback
  const [activeTab, setActiveTab] = useState('dashboard');
  const [forgotEmail, setForgotEmail] = useState('');
  const [passwordResetSent, setPasswordResetSent] = useState(false);

  // New Landing Showcase & Carousel Interactive States
  const [activeLandingTab, setActiveLandingTab] = useState<'excursiones' | 'despacho' | 'firmas'>('excursiones');
  const [landingClimate, setLandingClimate] = useState<'despejado' | 'tormenta'>('despejado');
  const [landingWspTemplate, setLandingWspTemplate] = useState<'recordatorio' | 'cancelacion' | 'waiver'>('recordatorio');
  const [landingSignatureSigned, setLandingSignatureSigned] = useState(false);
  const landingCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [landingIsDrawing, setLandingIsDrawing] = useState(false);

  React.useEffect(() => {
    if (user || landingIsDrawing) return;
    const interval = setInterval(() => {
      setActiveLandingTab(current => {
        if (current === 'excursiones') return 'despacho';
        if (current === 'despacho') return 'firmas';
        return 'excursiones';
      });
    }, 8000); // 8 seconds per slide
    return () => clearInterval(interval);
  }, [user, landingIsDrawing]);

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

  // Keep states in sync when agency is loaded/changed
  useEffect(() => {
    if (agency) {
      setEditAgencyName(agency.name || '');
      setEditAgencyCity(agency.city || '');
      setEditAgencyLogo(agency.logo_url || '');
      setEditAgencyWspTemplate(agency.whatsapp_template || '');
    }
  }, [agency]);

  // Keep user profile in sync
  useEffect(() => {
    if (user) {
      setEditUserName(user.full_name || '');
      setEditUserAvatar(user.avatar_url || '');
    }
  }, [user]);

  // Listen for global open pricing event
  useEffect(() => {
    const handleOpenPricing = () => {
      setIsPricingModalOpen(true);
    };
    const handleOpenDownload = () => {
      setIsDownloadModalOpen(true);
    };
    window.addEventListener('rumbo_open_pricing', handleOpenPricing);
    window.addEventListener('rumbo_open_download', handleOpenDownload);
    return () => {
      window.removeEventListener('rumbo_open_pricing', handleOpenPricing);
      window.removeEventListener('rumbo_open_download', handleOpenDownload);
    };
  }, []);

  const handleSaveAgency = () => {
    if (!agency) return;
    const updated = db.updateAgency(agency.id, {
      name: editAgencyName,
      city: editAgencyCity,
      logo_url: editAgencyLogo,
      whatsapp_template: editAgencyWspTemplate
    });
    if (updated) {
      refreshAgency();
      setIsAgencyModalOpen(false);
    }
  };

  const handleSaveUserProfile = () => {
    if (!user) return;
    const fullDb = getDb();
    
    // Update user
    const userIndex = fullDb.users.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      const updatedUser = {
        ...fullDb.users[userIndex],
        full_name: editUserName,
        avatar_url: editUserAvatar
      };
      fullDb.users[userIndex] = updatedUser;
      saveDb(fullDb);
      
      // Update session user state
      localStorage.setItem('rumbo_user_session', JSON.stringify(updatedUser));
      
      // Sync to Supabase
      supabaseSync.upsertUser(updatedUser);
      
      // If they have a guide profile, update that too
      const guideIndex = fullDb.guides.findIndex(g => g.user_id === user.id || g.email.toLowerCase() === user.email.toLowerCase());
      if (guideIndex !== -1) {
        fullDb.guides[guideIndex] = {
          ...fullDb.guides[guideIndex],
          full_name: editUserName,
          avatar_url: editUserAvatar,
          updated_at: new Date().toISOString()
        };
        saveDb(fullDb);
        
        // Push updated guide to Supabase
        supabaseSync.upsertGuide(fullDb.guides[guideIndex]);
      }
      
      // Alert listeners
      const event = new Event('rumbo_db_updated');
      window.dispatchEvent(event);
      
      setIsProfileModalOpen(false);
      
      // Quick reload to refresh session across components cleanly
      window.location.reload();
    }
  };

  // Authentication Screen Substates: 'login' | 'register' | 'join-guide' | 'forgot' | 'reset'
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
  
  // Reset token / simulation helper
  const [resetPasswordState, setResetPasswordState] = useState('');

  // Handle URL hash changes for advanced navigation and routing compliance!
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/register') {
        setAuthView('register');
      } else if (hash === '#/join-guide') {
        setAuthView('join-guide');
      } else if (hash === '#/forgot-password') {
        setAuthView('forgot');
      } else if (hash.startsWith('#/reset-password')) {
        setAuthView('reset');
      } else if (hash === '#/login') {
        setAuthView('login');
      } else if (user && agency) {
        // App inner navigation
        const tab = hash.replace('#/', '');
        const validTabs = ['dashboard', 'activities', 'guides', 'reports'];
        if (validTabs.includes(tab)) {
          if (!isAdmin && (tab === 'reports')) {
            setActiveTab('dashboard');
            navigateToHash('#/dashboard');
          } else {
            setActiveTab(tab);
          }
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run initially
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, agency, isAdmin]);

  // Handle auto lookup of guide invitation codes as they type them
  useEffect(() => {
    if (joinCode.length >= 4) {
      const target = db.lookupAgencyByCode(joinCode);
      setPreviewAgency(target);
    } else {
      setPreviewAgency(null);
    }
  }, [joinCode]);

  const navigateToHash = (newHash: string) => {
    window.location.hash = newHash;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    const res = await signIn(email, password);
    if (res.success) {
      navigateToHash('#/dashboard');
    } else {
      alert(res.error || 'Error al iniciar sesión. Por favor verifica tus datos.');
    }
  };

  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !agencyName || !city) {
      alert('Por favor completa todos los campos para crear tu agencia de turismo.');
      return;
    }
    const res = await signUpAdmin(email, password, fullName, agencyName, city, registerLogo);
    if (res.success) {
      navigateToHash('#/dashboard');
    } else {
      alert(res.error || 'Error al registrar la agencia. Por favor verifica tus datos.');
    }
  };

  const handleGuideRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName || !joinCode || !phone) {
      alert('Por favor completa el formulario de reclutamiento.');
      return;
    }
    const res = await signUpGuide(email, password, fullName, joinCode, phone, registerAvatar);
    if (res.success) {
      navigateToHash('#/dashboard');
    } else {
      alert(res.error);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setPasswordResetSent(true);
    db.createNotification('agc-1', 'system', 'Recuperación Solicitada', `Se envió una simulación de restablecimiento a ${forgotEmail}`, null);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordState) return;
    alert('Tu contraseña simulada ha sido actualizada con éxito.');
    setAuthView('login');
    navigateToHash('#/login');
  };

  // Static login fillers for super pleasant testing and evaluation!
  const fillGuestLogin = (type: 'admin' | 'guide') => {
    if (type === 'admin') {
      setEmail('admin@rumbo.com');
      setPassword('admin');
    } else {
      setEmail('guia@rumbo.com');
      setPassword('guia');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8F1F7] flex flex-col items-center justify-center font-sans">
        <Compass className="w-12 h-12 text-[#1F4D3A] animate-spin mb-4" />
        <h2 className="text-pine font-display font-semibold text-lg">Iniciando Rumbo...</h2>
        <p className="text-xs text-gray-500 mt-1">Sincronizando feed de salidas de terreno</p>
      </div>
    );
  }

  // 1. PUBLIC AUTHENTICATION SCREENS
  if (!user) {
    return (
      <div className="w-full min-h-screen bg-[#1F4D3A] font-sans flex items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden">
        
        {/* Background glow effects to make it premium */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#0F6BA8]/10 blur-3xl pointer-events-none" />

        {/* COMPACT CARD FOR AUTH & SIGN-UP */}
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-150 relative z-10 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header BRANDING */}
          <div className="text-center mb-6 border-b border-gray-100 pb-5">
            <div className="w-12 h-12 bg-[#1F4D3A] text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-950/10">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-display font-black text-[#1F4D3A] tracking-tight leading-none">Rumbo</h1>
            <p className="text-[10px] text-[#0F6BA8] font-bold tracking-wider uppercase mt-1">Gestión & Logística de Aventura</p>
          </div>

          <div className="w-full">
            {/* VIEW A: LOGIN */}
            {authView === 'login' && (
              <div className="flex flex-col gap-5 text-left animate-in fade-in duration-150">
                {!isSupabaseConfigured && (
                  <>
                    {/* Highly-styled callout for the Interactive Demo Mode */}
                    <div className="relative overflow-hidden p-4.5 rounded-2xl bg-linear-to-br from-[#1F4D3A] to-emerald-900 text-white shadow-md flex flex-col gap-2.5 text-left border border-emerald-950/20">
                      <div className="absolute right-[-2rem] bottom-[-2rem] w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />
                      
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">Entrada Rápida / Modo Demo</span>
                      </div>
                      
                      <p className="text-[11px] leading-relaxed text-emerald-100/90">
                        Evalúa la plataforma en vivo con clima dinámico, deslindes digitales y control de operaciones. No requiere registrarse.
                      </p>
                      
                      <button
                        type="button"
                        onClick={async () => {
                          resetDbToDemo();
                          localStorage.setItem('rumbo_demo_mode', 'true');
                          const res = await signIn('admin@rumbo.com', 'admin');
                          if (res.success) {
                            navigateToHash('#/dashboard');
                          }
                        }}
                        className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-gray-950 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <span>🎯 Explorar Demo en Vivo</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-950" />
                      </button>
                    </div>

                    <div className="flex items-center my-1 select-none">
                      <div className="flex-1 border-t border-gray-150" />
                      <span className="px-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">O acceder con tu cuenta</span>
                      <div className="flex-1 border-t border-gray-150" />
                    </div>
                  </>
                )}

                <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Correo electrónico:</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type="email"
                        required
                        placeholder="ejemplo@rumbo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-200 focus:ring-2 focus:ring-pine/30 focus:border-pine rounded-xl px-3 py-2.5 pl-10 text-xs bg-white text-gray-800 outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <label className="text-xs font-semibold text-gray-700">Contraseña:</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthView('forgot');
                          navigateToHash('#/forgot-password');
                        }}
                        className="text-[11px] text-[#0F6BA8] hover:underline cursor-pointer font-bold"
                      >
                        ¿Olvidaste tu clave?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-200 focus:ring-2 focus:ring-pine/30 focus:border-pine rounded-xl px-3 py-2.5 pl-10 text-xs bg-white text-gray-800 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-pine hover:bg-pine/90 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all transform hover:scale-[1.01] active:scale-[0.99] mt-1"
                  >
                    Iniciar Sesión
                  </button>
                </form>

                <div className="border-t border-gray-100 pt-3 flex flex-col gap-2 text-center text-xs text-slate-500">
                  <p className="font-medium select-none">
                    ¿Quieres registrar una nueva agencia de turismo?{' '}
                    <button
                      onClick={() => {
                        setAuthView('register');
                        navigateToHash('#/register');
                      }}
                      className="font-bold text-pine hover:underline cursor-pointer"
                    >
                      Registrar Agencia
                    </button>
                  </p>
                  
                  <p className="font-medium select-none">
                    ¿Eres un guía de excursiones?{' '}
                    <button
                      onClick={() => {
                        setAuthView('join-guide');
                        navigateToHash('#/join-guide');
                      }}
                      className="font-bold text-[#0F6BA8] hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto mt-1"
                    >
                      <UserPlus className="w-4 h-4 text-[#0F6BA8]" /> Unirme como Guía Corporativa
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* VIEW B: REGISTER ADMIN */}
            {authView === 'register' && (
              <div className="flex flex-col gap-5 text-left">
                <div>
                  <button
                    onClick={() => {
                      setAuthView('login');
                      navigateToHash('#/login');
                    }}
                    className="text-xs text-gray-400 hover:text-pine font-medium flex items-center gap-1 cursor-pointer mb-2 animate-none"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver al portal
                  </button>
                  <h3 className="font-display font-semibold text-2xl text-pine">Registrar tu Agencia</h3>
                  <p className="text-xs text-gray-500">Crea tu cuenta de titular y da de alta tu feed corporativo.</p>
                </div>

                <form onSubmit={handleAdminRegister} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre y apellido del Titular:</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type="text"
                        required
                        placeholder="Matias Abarca"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pl-10 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre de la Agencia:</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
                        <input
                          type="text"
                          required
                          placeholder="Rumbo Aventura"
                          value={agencyName}
                          onChange={(e) => setAgencyName(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pl-10 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Ciudad Base:</label>
                      <CityAutocomplete
                        value={city}
                        onChange={(val) => setCity(val)}
                        placeholder="Busca e ingresa localidad base (ej: Pucón)..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1 font-sans">Logo de la Agencia (Arrastra o haz clic):</label>
                    <FileUpload 
                      onUpload={(base64) => setRegisterLogo(base64)} 
                      currentUrl={registerLogo} 
                      placeholderText="Arrastra el logo institucional o haz clic para subir"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Correo electrónico:</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@tuagencia.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white text-gray-855 outline-none focus:ring-2 focus:ring-pine/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Contraseña:</label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-white text-gray-855 outline-none focus:ring-2 focus:ring-pine/30"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[#1F4D3A] hover:bg-[#173b2c] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all mt-2"
                  >
                    Crear Agencia & Cuenta
                  </button>
                </form>
              </div>
            )}

            {/* VIEW C: REGISTER GUIDE WITH INVITE CODE */}
            {authView === 'join-guide' && (
              <div className="flex flex-col gap-5 text-left">
                <div>
                  <button
                    onClick={() => {
                      setAuthView('login');
                      navigateToHash('#/login');
                    }}
                    className="text-xs text-gray-400 hover:text-pine font-medium flex items-center gap-1 cursor-pointer mb-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver al portal
                  </button>
                  <h3 className="font-display font-semibold text-2xl text-pine">Unirme como Guía</h3>
                  <p className="text-xs text-gray-500">Usa el código corporativo de 8 dígitos de tu agencia.</p>
                </div>

                <form onSubmit={handleGuideRegister} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Código de Agencia (8 dígitos):</label>
                    <input
                      type="text"
                      maxLength={8}
                      required
                      placeholder="ej: RUMBOPAT"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 font-mono text-center text-sm font-bold bg-[#E8F1F7]/30 text-pine outline-none focus:ring-2 focus:ring-pine/30"
                    />

                    {/* Instant Public Preview of target agency */}
                    {previewAgency ? (
                      <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex gap-2.5 items-center animate-in fade-in slide-in-from-top-1 duration-100 text-[11px] text-emerald-850">
                        <img
                          src={previewAgency.logo_url}
                          alt="logo"
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                        <div>
                          <p className="font-bold flex items-center gap-1">✅ {previewAgency.name}</p>
                          <p className="text-gray-505">{previewAgency.city}</p>
                        </div>
                      </div>
                    ) : (
                      joinCode.length >= 4 && (
                        <p className="text-[10px] text-red-500 font-bold mt-2 text-center font-semibold">
                          🔍 Buscando agencia... Ingresa un código válido (prueba: RUMBOPAT)
                        </p>
                      )
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre completo:</label>
                    <input
                      type="text"
                      required
                      placeholder="Agustín Somma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white text-gray-855 outline-none focus:ring-2 focus:ring-pine/30"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1 font-sans">Foto de Perfil (Arrastra o haz clic):</label>
                    <FileUpload 
                      onUpload={(base64) => setRegisterAvatar(base64)} 
                      currentUrl={registerAvatar} 
                      placeholderText="Arrastra tu foto de perfil o haz clic para subir"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Celular / WhatsApp:</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
                        <input
                          type="tel"
                          required
                          placeholder="+5492944112233"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pl-10 text-xs font-mono bg-white text-gray-855 outline-none focus:ring-2 focus:ring-pine/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Correo electrónico:</label>
                      <input
                        type="email"
                        required
                        placeholder="guia@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white text-gray-855 outline-none focus:ring-2 focus:ring-pine/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Contraseña de acceso:</label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 símbolos"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-white text-gray-850 outline-none focus:ring-2 focus:ring-pine/30"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-ocean hover:bg-[#0c598c] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all mt-2"
                  >
                    Completar Enlace a Agencia
                  </button>
                </form>
              </div>
            )}

            {/* VIEW D: FORGOT PASSWORD */}
            {authView === 'forgot' && (
              <div className="flex flex-col gap-5 text-left">
                <div>
                  <button
                    onClick={() => {
                      setAuthView('login');
                      navigateToHash('#/login');
                    }}
                    className="text-xs text-gray-400 hover:text-pine font-medium flex items-center gap-1 cursor-pointer mb-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver al portal
                  </button>
                  <h3 className="font-display font-semibold text-2xl text-pine">Recuperar Contraseña</h3>
                  <p className="text-xs text-gray-500">Ingresa tu email para recibir un enlace de restauración.</p>
                </div>

                {passwordResetSent ? (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-emerald-800 text-xs leading-relaxed text-center flex flex-col items-center gap-2">
                    <span className="text-2xl">✉️</span>
                    <strong>¡Vínculo de simulación enviado!</strong>
                    <span>Hemos enviado un mail de restauración simulado a <strong>{forgotEmail}</strong>.</span>
                    <button
                      onClick={() => {
                        setAuthView('reset');
                        navigateToHash('#/reset-password');
                      }}
                      className="mt-2 py-1.5 px-4 bg-emerald-600 hover:bg-emerald-750 text-white rounded-lg font-bold"
                    >
                      Ir a Re-establecer Contraseña
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">Correo electrónico:</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@rumbo.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-pine text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                    >
                      Enviar Mail de Recuperación
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* VIEW E: RESET PASSWORD */}
            {authView === 'reset' && (
              <div className="flex flex-col gap-5 text-left">
                <div>
                  <h3 className="font-display font-semibold text-2xl text-pine">Nueva Contraseña</h3>
                  <p className="text-xs text-gray-500">Ingresa tu nueva contraseña de acceso.</p>
                </div>

                <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Nueva Contraseña:</label>
                    <input
                      type="password"
                      required
                      placeholder="Ingresa al menos 6 dígitos"
                      value={resetPasswordState}
                      onChange={(e) => setResetPasswordState(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-white text-gray-805 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-pine text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
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

  // 2. LOGGED IN HANDLER WITH MOCK "WITHOUT AGENCY" SCREEN
  if (!agency) {
    return (
      <div className="min-h-screen bg-[#E8F1F7] flex items-center justify-center p-4 text-left font-sans">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-150">
          <div className="text-center mb-6">
            <Building className="w-12 h-12 text-[#1F4D3A] mx-auto mb-3" />
            <h2 className="text-2xl font-display font-bold text-pine leading-tight">Sesión activa pero sin Agencia asignada</h2>
            <p className="text-xs text-gray-451 mt-1.5 leading-snug">
              Puedes fundar una nueva agencia como titular o enlistarte de forma corporativa en un feed ya activo de guías.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                signOut();
                setAuthView('register');
                navigateToHash('#/register');
              }}
              className="w-full py-3 bg-pine text-white hover:bg-pine-hover rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-95 text-center block"
            >
              🏢 Crear una nueva Agencia de aventura
            </button>
            <button
              onClick={() => {
                signOut();
                setAuthView('join-guide');
                navigateToHash('#/join-guide');
              }}
              className="w-full py-3 bg-ocean text-white hover:bg-[#0c598c] rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-95 text-center block"
            >
              🧭 Unirme como Guía (Tengo Código)
            </button>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-150 text-gray-600 rounded-xl text-xs font-semibold block text-center mt-4 transition-all active:scale-95 cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  // 2.2 GUIDE NOT APPROVED SCREEN
  if (!isGuideApproved) {
    return (
      <div className="min-h-screen bg-[#E8F1F7] flex items-center justify-center p-4 text-left font-sans animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-150">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-display font-bold text-pine leading-tight text-center">esperando por confirmación para unirse a la agencia</h2>
            <p className="text-xs text-gray-500 mt-2.5 leading-relaxed">
              Tu solicitud para unirte a la agencia <strong className="text-gray-800 font-semibold">{agency.name}</strong> está en proceso de revisión.
            </p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              De esta manera evitamos que si el código se filtra cualquier persona acceda a la información técnica. Un administrador debe aprobar tu vinculación en el <strong>Panel de Guías</strong> de la agencia.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 text-center">
            <span className="text-[10px] text-gray-400 font-mono block">ESTADO: Esperando confirmación</span>
            <span className="text-[10px] text-gray-400 font-mono block mt-1">Usuario: {user?.email}</span>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full py-3 bg-gray-100 hover:bg-gray-150 text-gray-600 rounded-xl text-xs font-semibold block text-center mt-6 transition-all active:scale-95 cursor-pointer"
          >
            Cerrar Sesión / Cancelar
          </button>
        </div>
      </div>
    );
  }

  // 3. MAIN APP SHELL (Desktop Lateral Rail + Bottom Navigation)
  return (
    <div className="min-h-screen bg-[#E8F1F7]/40 flex flex-col md:flex-row font-sans">
      
      {/* A. SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex md:w-64 bg-pine text-white flex-col justify-between p-5 border-r border-[#1F4D3A] shrink-0 text-left">
        <div className="flex flex-col gap-8">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-black text-lg tracking-wider block">Rumbo</span>
              <span className="text-[10px] text-[#E8F1F7]/60 font-bold block uppercase tracking-widest leading-none">Aventura</span>
            </div>
          </div>

          {/* Navigation link group */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => { setActiveTab('dashboard'); navigateToHash('#/dashboard'); }}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'dashboard' 
                  ? 'bg-white/12 text-white font-bold' 
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              Operaciones Diarias
            </button>

            <button
              onClick={() => { setActiveTab('activities'); navigateToHash('#/activities'); }}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'activities' 
                  ? 'bg-white/12 text-white font-bold' 
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ActivitiesIcon className="w-4 h-4 shrink-0" />
              Catálogo Actividades
            </button>

            <button
              onClick={() => { setActiveTab('guides'); navigateToHash('#/guides'); }}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === 'guides' 
                  ? 'bg-white/12 text-white font-bold' 
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              Equipo de Guías
            </button>


            {isAdmin && (
              <button
                onClick={() => { setActiveTab('reports'); navigateToHash('#/reports'); }}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  activeTab === 'reports' 
                    ? 'bg-white/12 text-white font-bold' 
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <LineChart className="w-4 h-4 shrink-0" />
                Métricas / Reportes
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setIsPricingModalOpen(true)}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all text-white/70 hover:bg-white/5 hover:text-white"
              >
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
                Planes y Suscripción
              </button>
            )}

            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all text-emerald-400 hover:bg-white/5 hover:text-emerald-300"
            >
              <Smartphone className="w-4 h-4 shrink-0 text-emerald-400 animate-pulse" />
              Descargar App Terreno
            </button>
          </nav>
        </div>

        {/* User login feedback + Sign Out */}
        <div className="flex flex-col gap-4 border-t border-white/10 pt-4">
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2.5 hover:bg-white/5 p-1.5 rounded-xl cursor-pointer transition-colors"
            title="Editar Mi Perfil / Foto"
          >
            {user.avatar_url ? (
              <img 
                src={user.avatar_url}
                alt={user.full_name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover border border-white/15 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs text-white shrink-0">
                {user.full_name?.substr(0, 2).toUpperCase() || 'US'}
              </div>
            )}
            <div className="truncate text-left">
              <p className="text-xs font-bold leading-tight text-white flex items-center gap-1 truncate">
                {user.full_name}
                <UserCheck className="w-3 h-3 text-[#58A6FF] shrink-0" />
              </p>
              <span className="text-[10px] text-[#E8F1F7]/60 block leading-none mt-1">
                {isAdmin ? '👑 Administrador' : '🧭 Guía Terreno'}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center justify-center gap-2 py-2 px-3 bg-white/5 hover:bg-red-900/40 text-white hover:text-red-100 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* B. MAIN INTERACTIVE CONTENT GRID AREA */}
      <div className="flex-1 flex flex-col min-h-screen">
        
        {/* Sticky Demo Mode Top Banner */}
        {localStorage.getItem('rumbo_demo_mode') === 'true' && (
          <div className="bg-linear-to-r from-[#1F4D3A] via-[#0F6BA8] to-emerald-800 text-white text-center py-2.5 px-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-[11px] font-semibold animate-in slide-in-from-top duration-300 z-50 shadow-md">
            <div className="flex items-center gap-1.5 flex-wrap justify-center text-center">
              <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>Estás explorando Rumbo en <strong>Modo Demostración</strong>. Modifica los datos corporativos, guías u operaciones con total libertad.</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('rumbo_demo_mode');
                  signOut();
                  setAuthView('register');
                  navigateToHash('#/register');
                }}
                className="bg-amber-400 hover:bg-amber-300 text-gray-950 font-bold px-3 py-1 rounded-full text-[9px] uppercase tracking-wider transition-all shadow-xs shrink-0 cursor-pointer"
              >
                ➕ Crear Mi Propia Agencia Grátis
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('rumbo_demo_mode');
                  signOut();
                  setAuthView('login');
                  navigateToHash('#/login');
                }}
                className="text-white/80 hover:text-white underline text-[9.5px] cursor-pointer shrink-0"
              >
                Cerrar Demo de Prueba
              </button>
            </div>
          </div>
        )}
        
        {/* TOP MOBILE BAR WITH LOGO, NOTIFICATIONS */}
        <header className="bg-pine text-white md:bg-white md:text-gray-900 border-b border-gray-100 p-4 px-5 flex items-center justify-between z-30 shadow-xs text-left">
          {/* Logo and agency info on mobile */}
          <div className="flex items-center gap-2.5 md:hidden text-left">
            <img
              src={agency.logo_url}
              alt={agency.name}
              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/25 shadow-2xs"
            />
            <div className="leading-tight">
              <span className="font-display font-bold text-xs block text-white truncate max-w-[160px]">
                {agency.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] text-white/70 block leading-none">
                  {isAdmin ? '👑 Admin' : '🧭 Guía'}
                </span>
                <span className="text-white/40 text-[9px]">|</span>
                <button
                  type="button"
                  onClick={() => setIsPricingModalOpen(true)}
                  className="bg-white/10 text-white hover:bg-white/20 text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider"
                >
                  {agency.subscription_plan || 'free'}
                </button>
              </div>
            </div>
          </div>

          {/* Connected Agency Showcase */}
          <div 
            onClick={() => isAdmin && setIsAgencyModalOpen(true)}
            className={`hidden md:flex items-center gap-3.5 p-1.5 rounded-2xl transition-colors border border-transparent ${isAdmin ? 'hover:bg-gray-50 cursor-pointer hover:border-gray-150' : ''}`}
            title={isAdmin ? "Editar Información y Logo de la Agencia" : ""}
          >
            <img
              src={agency.logo_url}
              alt={agency.name}
              className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-100 shadow-2xs"
            />
            <div className="text-left">
              <p className="text-sm font-semibold text-pine leading-none font-display flex items-center gap-1">
                {agency.name}
                {isAdmin && <Settings className="w-3.5 h-3.5 text-pine/60 shrink-0" />}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-gray-400 block">Rumbo Cod: <strong className="font-mono">{agency.join_code}</strong></span>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsPricingModalOpen(true); }}
                  className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md border cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-3xs ${
                    (agency.subscription_plan || 'free') === 'pro'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : (agency.subscription_plan || 'free') === 'premium'
                      ? 'bg-pine/10 text-pine border-pine/20'
                      : 'bg-amber-50 text-amber-800 border-amber-150'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                  {(agency.subscription_plan || 'free') === 'free' ? 'Gratis' : agency.subscription_plan}
                </button>
              </div>
            </div>
            
            {/* Supabase Status Pill */}
            {isSupabaseConfigured ? (
              supabaseSyncError ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full font-bold border border-amber-200 shadow-xs ml-2 select-none cursor-help" title={`Configurado (${supabaseUrl}) pero con tablas faltantes en Supabase. Debes ejecutar el archivo supabase_schema.sql en el 'SQL Editor' de tu panel.`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  Estructura Incompleta (Modo Local fallback)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full font-bold border border-emerald-150 shadow-xs ml-2 select-none cursor-help" title={`Sincronizado con: ${supabaseUrl}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Sincronizado
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] bg-[#E8F1F7]/80 text-[#0F6BA8] px-2.5 py-1 rounded-full font-bold border border-[#bcd0e3] shadow-xs ml-2 select-none" title="Modo local. Los datos se guardan en el almacenamiento local de tu navegador.">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                Modo Local
              </span>
            )}
          </div>

          {/* Right Action: Notifications */}
          <div className="flex items-center gap-3">
            <NotificationsCenter agencyId={agency.id} />
            
            {/* Quick Mobile close session icon */}
            <button
              onClick={() => signOut()}
              className="md:hidden p-2 text-white hover:bg-white/10 rounded-full"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* RENDERED ROUTE VIEW PANEL WITH ANIMATIONS */}
        <main className="flex-1 p-3 sm:p-6 pb-24 md:pb-8">
          {activeTab === 'dashboard' && <DashboardView onNavigate={(h) => navigateToHash(h)} />}
          {activeTab === 'activities' && <ActivitiesView />}
          {activeTab === 'guides' && <GuidesView />}
          {activeTab === 'reports' && <ReportsView />}
        </main>
      </div>

      {/* C. MOBILE BOTTOM NAV RAIL */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-150 z-40 flex items-center justify-around p-2.5 md:hidden">
        <button
          onClick={() => { setActiveTab('dashboard'); navigateToHash('#/dashboard'); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${
            activeTab === 'dashboard' ? 'text-pine' : 'text-gray-400'
          }`}
        >
          <LayoutDashboard className="w-4.5 h-4.5" />
          Operaciones
        </button>

        <button
          onClick={() => { setActiveTab('activities'); navigateToHash('#/activities'); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${
            activeTab === 'activities' ? 'text-pine' : 'text-gray-400'
          }`}
        >
          <ActivitiesIcon className="w-4.5 h-4.5" />
          Catálogo
        </button>

        <button
          onClick={() => { setActiveTab('guides'); navigateToHash('#/guides'); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${
            activeTab === 'guides' ? 'text-pine' : 'text-gray-400'
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          Guías
        </button>


        {isAdmin && (
          <button
            onClick={() => { setActiveTab('reports'); navigateToHash('#/reports'); }}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg text-[9px] font-bold ${
              activeTab === 'reports' ? 'text-[#1F4D3A]' : 'text-gray-400'
            }`}
          >
            <LineChart className="w-4.5 h-4.5" />
            Métricas
          </button>
        )}
      </nav>

      {/* MODAL: EDIT AGENCY */}
      {isAgencyModalOpen && agency && (
        <div id="modal-agency-edit" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 text-left overflow-y-auto">
          {/* Backdrop */}
          <div className="absolute inset-0" onClick={() => setIsAgencyModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-gray-150 z-10 animate-in zoom-in-95 duration-150">
            <h3 className="font-display font-semibold text-lg text-pine mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Building className="w-5 h-5 text-pine" />
              Editar Agencia
            </h3>
            
            <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre de la Agencia:</label>
                <input
                  type="text"
                  value={editAgencyName}
                  onChange={(e) => setEditAgencyName(e.target.value)}
                  className="w-full border border-gray-250 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Ciudad de Operación:</label>
                <CityAutocomplete
                  value={editAgencyCity}
                  onChange={(val) => setEditAgencyCity(val)}
                  placeholder="Busca e ingresa ciudad base..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Logo de la Empresa:</label>
                <FileUpload 
                  onUpload={(base64) => setEditAgencyLogo(base64)} 
                  currentUrl={editAgencyLogo} 
                  placeholderText="Arrastra el logo institucional o haz clic para subir"
                />
                <input
                  type="text"
                  placeholder="O ingresa enlace directo"
                  value={editAgencyLogo.startsWith('data:image/') ? '' : editAgencyLogo}
                  onChange={(e) => setEditAgencyLogo(e.target.value)}
                  className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div className="border-t border-gray-100 pt-3">
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Plantilla Mensaje WhatsApp Recordatorio:
                </label>
                <textarea
                  value={editAgencyWspTemplate}
                  onChange={(e) => setEditAgencyWspTemplate(e.target.value)}
                  placeholder="Hola *{pasajero}*, te recordamos de tu excursión con *Rumbo*..."
                  className="w-full border border-gray-250 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none h-24 focus:ring-2 focus:ring-pine/30 font-sans"
                />
                <span className="text-[10px] text-gray-400 mt-1 block leading-normal">
                  Puedes ingresar textos con formato WhatsApp (como *negritas*). Etiquetas dinámicas admitidas:<br />
                  <span className="font-mono text-gray-600 bg-gray-50 px-1 py-0.5 rounded text-[8px] inline-block mr-1">{"{pasajero}"}</span> Nombre completo<br />
                  <span className="font-mono text-gray-600 bg-gray-50 px-1 py-0.5 rounded text-[8px] inline-block mr-1">{"{actividad}"}</span> Nombre excursión<br />
                  <span className="font-mono text-gray-600 bg-gray-50 px-1 py-0.5 rounded text-[8px] inline-block mr-1">{"{fecha}"}</span> Día/Mes<br />
                  <span className="font-mono text-gray-600 bg-gray-50 px-1 py-0.5 rounded text-[8px] inline-block mr-1">{"{hora}"}</span> Horario de encuentro<br />
                  <span className="font-mono text-gray-600 bg-gray-50 px-1 py-0.5 rounded text-[8px] inline-block mr-1">{"{punto_encuentro}"}</span> Dirección/Ubicación<br />
                  <span className="font-mono text-gray-600 bg-gray-50 px-1 py-0.5 rounded text-[8px] inline-block mr-1">{"{pasajeros}"}</span> Cantidad de vacantes
                </span>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-50 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAgencyModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-150 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAgency}
                  className="px-4 py-2 bg-pine text-white hover:bg-pine-hover text-xs font-bold rounded-xl cursor-pointer shadow-sm"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER PROFILE */}
      {isProfileModalOpen && user && (
        <div id="modal-profile-edit" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 text-left overflow-y-auto">
          {/* Backdrop */}
          <div className="absolute inset-0" onClick={() => setIsProfileModalOpen(false)} />
          
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-150 z-10 animate-in zoom-in-95 duration-150">
            <h3 className="font-display font-semibold text-lg text-pine mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
              <User className="w-5 h-5 text-pine" />
              Editar Mi Perfil
            </h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full border border-gray-250 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Correo Electrónico (No editable):</label>
                <input
                  type="text"
                  disabled
                  value={user.email}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-gray-50 text-gray-400 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Foto de Perfil (Avatar):</label>
                <FileUpload 
                  onUpload={(base64) => setEditUserAvatar(base64)} 
                  currentUrl={editUserAvatar} 
                  placeholderText="Arrastra tu foto de perfil o haz clic para subir"
                />
                <input
                  type="text"
                  placeholder="O ingresa enlace directo"
                  value={editUserAvatar.startsWith('data:image/') ? '' : editUserAvatar}
                  onChange={(e) => setEditUserAvatar(e.target.value)}
                  className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-50 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-150 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserProfile}
                  className="px-4 py-2 bg-pine text-white hover:bg-pine-hover text-xs font-bold rounded-xl cursor-pointer shadow-sm"
                >
                  Actualizar Datos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MONTISED PLAN OPTIONS MODAL */}
      <PricingModal 
        isOpen={isPricingModalOpen} 
        onClose={() => setIsPricingModalOpen(false)} 
      />

      {/* MOBILE APPLICATION INSTALL CENTER */}
      <DownloadAppModal 
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {/* Floating Simulation Console Rig removed */}
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
