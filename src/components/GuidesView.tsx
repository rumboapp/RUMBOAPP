/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth-context';
import { Guide, AgencyMember, MockUser, AgencyRole } from '../types';
import { 
  Plus, Edit, Trash2, Phone, Mail, Award, Check, X, 
  ShieldAlert, Sparkles, UserCheck, Clipboard, Key, BadgeAlert, Users, Shield, UserX
} from 'lucide-react';
import { FileUpload } from './FileUpload';

export default function GuidesView() {
  const { agency, isAdmin, user: currentUser } = useAuth();
  const agencyId = agency?.id || '';

  const [guides, setGuides] = useState<Guide[]>([]);
  const [members, setMembers] = useState<{ member: AgencyMember; user: MockUser }[]>([]);
  const [copied, setCopied] = useState(false);
  
  // Modal State for Guide Registration
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);

  // Guide Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialtyStr, setSpecialtyStr] = useState(''); // comma-separated
  const [active, setActive] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');

  const loadData = () => {
    if (!agencyId) return;
    setGuides(db.getGuides(agencyId));
    setMembers(db.getMembers(agencyId));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('rumbo_db_updated', loadData);
    return () => window.removeEventListener('rumbo_db_updated', loadData);
  }, [agencyId]);

  const handleCopyCode = () => {
    if (!agency?.join_code) return;
    navigator.clipboard.writeText(agency.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openAddModal = () => {
    const currentPlan = agency?.subscription_plan || 'free';
    const planLimits = { free: 2, premium: 20, pro: 100 };
    const limit = planLimits[currentPlan as keyof typeof planLimits] || 2;

    if (guides.length >= limit) {
      if (confirm(`Has alcanzado el límite de tu Plan ${currentPlan === 'free' ? 'Gratuito' : currentPlan} (${limit} guías). ¿Deseas ver los planes de suscripción para expandir tu cupo?`)) {
        window.dispatchEvent(new Event('rumbo_open_pricing'));
      }
      return;
    }

    setEditingGuide(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setSpecialtyStr('');
    setActive(true);
    setAvatarUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (g: Guide) => {
    setEditingGuide(g);
    setFullName(g.full_name);
    setPhone(g.phone);
    setEmail(g.email);
    setSpecialtyStr(g.specialties.join(', '));
    setActive(g.active);
    setAvatarUrl(g.avatar_url || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !email) {
      alert('Por favor completa todos los datos obligatorios.');
      return;
    }

    const specialtiesList = specialtyStr
       .split(',')
       .map(s => s.trim())
       .filter(s => s.length > 0);

    const payload = {
      user_id: editingGuide ? editingGuide.user_id : null,
      full_name: fullName,
      phone,
      email,
      specialties: specialtiesList.length > 0 ? specialtiesList : ['Turismo General'],
      active,
      avatar_url: avatarUrl
    };

    if (editingGuide) {
      db.updateGuide(editingGuide.id, payload);
    } else {
      db.createGuide(agencyId, payload);
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleDeleteGuide = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar a ${name} del plantel de guías? Se quitará de todas las salidas asignadas.`)) {
      db.deleteGuide(id);
      loadData();
    }
  };

  const handleToggleActive = (g: Guide) => {
    db.updateGuide(g.id, { active: !g.active });
    loadData();
  };

  // Privileges / Members controls
  const handleToggleAdmin = (g: Guide) => {
    if (!isAdmin) {
      alert('Solo los administradores de agencia pueden modificar los privilegios.');
      return;
    }
    if (!g.user_id) {
      alert('Solo los guías con cuenta vinculada digitalmente pueden recibir permisos de Administrador.');
      return;
    }
    
    const targetMember = members.find(m => m.user.id === g.user_id);
    if (!targetMember) return;

    if (targetMember.user.id === currentUser?.id) {
      alert('No puedes rebajarte el rol a ti mismo.');
      return;
    }

    const currentRole = targetMember.member.role;
    const nextRole = currentRole === AgencyRole.ADMIN ? AgencyRole.GUIA : AgencyRole.ADMIN;
    const confirmMsg = nextRole === AgencyRole.ADMIN 
      ? `¿Deseas ascender a ${g.full_name} a Administrador de la agencia? Tendrá permisos totales de facturación, tarifas y legajos.`
      : `¿Deseas revocar permisos de Administrador para ${g.full_name} y dejarlo como Guía Coordinador standard?`;

    if (confirm(confirmMsg)) {
      db.updateMemberRole(targetMember.member.id, nextRole);
      loadData();
    }
  };

  const handleRemoveFromAgency = (g: Guide) => {
    if (g.user_id && g.user_id === currentUser?.id) {
      alert('No puedes desvincularte a ti mismo.');
      return;
    }

    const confirmMsg = g.user_id
      ? `¿Deseas desvincular por completo a ${g.full_name} de la plataforma? Perderá el acceso de inicio de sesión de inmediato.`
      : `¿Retirar perfil de guía a ${g.full_name}?`;

    if (confirm(confirmMsg)) {
      db.deleteGuide(g.id);
      if (g.user_id) {
        const targetMember = members.find(m => m.user.id === g.user_id);
        if (targetMember) {
          db.deleteMember(targetMember.member.id);
        }
      }
      loadData();
    }
  };

  const pendingRequests = guides.filter(g => !g.active && g.user_id);
  const activePlantel = guides.filter(g => g.active || !g.user_id);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-1 sm:px-4">
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white rounded-2xl p-5 border border-gray-100 shadow-card text-left">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium text-pine">
            Equipo de Guías & Reclutamiento
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Reclutamiento de guías en vivo, asignación de privilegios administrativos y gestión de deslindes/salidas de terreno.
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] flex-wrap">
            <span className="font-semibold text-gray-505 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-full">
              Cupo de Guías: <strong className="text-pine font-mono">{guides.length}</strong> de <strong className="font-mono">{agency?.subscription_plan === 'pro' ? '100 (Pro)' : agency?.subscription_plan === 'premium' ? '20 (Premium)' : '2 (Gratuito)'}</strong>
            </span>
            <button 
              type="button"
              onClick={() => window.dispatchEvent(new Event('rumbo_open_pricing'))}
              className="text-pine font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 inline" /> Subir de Plan
            </button>
          </div>
        </div>
      </div>

      {/* Main Two Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
        
        {/* Left Hand: Invitation & Tools Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Card A: Invitation Code Card */}
          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm flex flex-col gap-4">
            <h3 className="font-semibold text-pine flex items-center gap-2 text-md">
              <Key className="w-5 h-5 text-orange-500 shrink-0" />
              Código de Invitación Directo
            </h3>
            
            <p className="text-xs text-gray-500 leading-relaxed">
              Comparte este código institucional con los guías de tu agencia. Al registrarse con él, se vincularán de inmediato a tu plantel:
            </p>

            <div className="bg-sky/50 border border-sky/80 rounded-2xl p-4 flex items-center justify-between mt-1">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block leading-none">Código Corporativo</span>
                <span className="text-2xl font-mono font-black text-pine tracking-wider mt-1 block select-all">{agency?.join_code}</span>
              </div>
              
              <button
                id="btn-copy-join-code"
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-4 py-2 bg-pine hover:bg-pine/90 text-white font-semibold rounded-xl text-xs shadow-xs transition-all active:scale-95 cursor-pointer leading-none shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> ¡Copiado!
                  </>
                ) : (
                  <>
                    <Clipboard className="w-3.5 h-3.5" /> Copiar Código
                  </>
                )}
              </button>
            </div>

            <div className="rounded-xl border border-sky/40 bg-sky/20 p-3 mt-1 flex gap-2">
              <BadgeAlert className="w-4 h-4 text-ocean shrink-0 mt-0.5" />
              <div className="text-[10px] text-ocean leading-normal">
                <strong>¿Cómo invitar guías?</strong> Pídeles que ingresen a <strong className="font-semibold">rumboapp.cl</strong>, seleccionen <strong>"Unirme como Guía"</strong> e ingresen este código. Aparecerán aquí como solicitudes pendientes inmediatamente.
              </div>
            </div>
          </div>
        </div>

        {/* Right Hand: Merged Lists (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* SECTION 1: PENDING GUIDE APPROVALS */}
          {pendingRequests.length > 0 && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <h2 className="font-semibold text-gray-800 text-md">
                  Solicitudes Pendientes de Aprobación
                </h2>
                <span className="text-[11px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">
                  {pendingRequests.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingRequests.map((g) => (
                  <div 
                    key={g.id} 
                    className="p-4 bg-amber-50/20 border border-amber-200/50 rounded-2xl flex flex-col justify-between gap-3 shadow-3xs"
                  >
                    <div className="flex items-center gap-3">
                      {g.avatar_url ? (
                        <img
                          src={g.avatar_url}
                          alt={g.full_name}
                          className="w-10 h-10 rounded-xl object-cover border border-amber-200/60 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-amber-150 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-200 shrink-0">
                          {g.full_name.substr(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-gray-800">{g.full_name}</h4>
                        <p className="text-[10px] text-gray-500 font-medium font-mono mt-0.5">{g.email}</p>
                      </div>
                    </div>

                    <div className="border-t border-amber-100/50 pt-2 flex flex-col gap-1 text-[11px] text-gray-500">
                      <span className="block leading-none">📞 {g.phone}</span>
                    </div>

                    {isAdmin ? (
                      <div className="grid grid-cols-2 gap-1.5 mt-1">
                        <button
                          onClick={() => handleRemoveFromAgency(g)}
                          className="py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <UserX className="w-3 h-3 text-gray-500" /> Rechazar
                        </button>
                        <button
                          onClick={() => handleToggleActive(g)}
                          className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <Check className="w-3 h-3" /> Aprobar Legajo
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-700 italic select-none mt-1">Esperando confirmación de Administrador...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: ACTIVE & MANUAL GUIDES */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <h2 className="font-semibold text-gray-800 text-md flex items-center gap-2">
                <Users className="w-4 h-4 text-pine" /> Plantel de Guías Activos
                <span className="text-xs px-2 py-0.5 bg-sky text-ocean rounded-full font-bold">
                  {activePlantel.length}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activePlantel.length === 0 ? (
                <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-3xl border border-gray-100">
                  <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold">No hay guías activos registrados</p>
                  <p className="text-xs text-gray-400 mt-1">Suministra el código de arriba o regístralos manualmente.</p>
                </div>
              ) : (
                activePlantel.map((g) => {
                  const isSelf = g.user_id && g.user_id === currentUser?.id;
                  const matchingMember = g.user_id ? members.find(m => m.user.id === g.user_id) : null;
                  const role = matchingMember?.member.role || AgencyRole.GUIA;

                  return (
                    <div
                      key={g.id}
                      className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-4 relative ${
                        g.active 
                          ? 'border-gray-150' 
                          : 'border-gray-250 bg-gray-50/50 opacity-75'
                      }`}
                    >
                      {/* Top profile part */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-3">
                          {g.avatar_url ? (
                            <img
                              src={g.avatar_url}
                              alt={g.full_name}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-xl object-cover border border-sky/80 shrink-0 shadow-3xs"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-sky text-ocean font-bold text-xs flex items-center justify-center border border-sky/85 shrink-0">
                              {g.full_name.split(' ').map(n => n[0]).join('').substr(0,2).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <h4 className="font-bold text-gray-800 text-xs truncate max-w-[150px]" title={g.full_name}>{g.full_name}</h4>
                              {isSelf && (
                                <span className="text-[8px] bg-slate-900 text-white font-bold px-1.5 py-0.2 rounded leading-none select-none">Tú</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {g.user_id ? (
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.2 rounded border border-emerald-100" title="Cuenta vinculada activa">
                                  <UserCheck className="w-2.5 h-2.5" /> Vinculado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] bg-gray-50 text-gray-500 font-medium px-1.5 py-0.2 rounded border border-gray-100" title="Perfil creado administrativamente">
                                  Manual
                                </span>
                              )}

                              <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${
                                role === AgencyRole.ADMIN 
                                  ? 'bg-orange-50 text-orange-850 border-orange-100 font-extrabold'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                              }`}>
                                {role === AgencyRole.ADMIN ? '👑 Admin' : '🧭 Guía'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dropdown controls or action icons */}
                        {isAdmin && (
                          <div className="flex gap-0.5 shrink-0">
                            <button
                              onClick={() => openEditModal(g)}
                              className="p-1 text-gray-400 hover:text-pine hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Editar legajo"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveFromAgency(g)}
                              className="p-1 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Dar de baja / Desvincular"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Specialties Formatted tags */}
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block mb-1">
                          Especialidades Homologadas
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                          {g.specialties.map((s, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-0.5 text-[8.5px] font-bold bg-sky/50 text-ocean px-1.5 py-0.5 rounded-md"
                            >
                              <Award className="w-2.5 h-2.5 text-orange-500 shrink-0" /> {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Phone & email row & role togglers */}
                      <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5 text-xs text-gray-500">
                        <a
                          href={`tel:${g.phone}`}
                          className="flex items-center gap-1.5 hover:text-pine transition-colors justify-start"
                        >
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /> <span className="font-mono text-[11px] font-medium">{g.phone}</span>
                        </a>
                        <a
                          href={`mailto:${g.email}`}
                          className="flex items-center gap-1.5 hover:text-pine transition-colors justify-start truncate"
                          title={g.email}
                        >
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /> <span className="font-mono text-[11px] truncate">{g.email}</span>
                        </a>
                      </div>

                      {/* Inline Administrative Actions */}
                      {isAdmin && g.user_id && !isSelf && (
                        <div className="border-t border-gray-50 pt-2.5 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleAdmin(g)}
                            className="text-[10px] font-bold tracking-tight text-pine hover:bg-sky px-2.5 py-1 border border-gray-150 hover:border-pine/30 rounded-lg cursor-pointer bg-transparent transition-all active:scale-95 flex items-center gap-1"
                          >
                            <Shield className="w-3 h-3 text-pine" />
                            {role === AgencyRole.ADMIN ? 'Hacer Guía' : 'Hacer Admin'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL: CREATE / EDIT MANUAL GUIDE */}
      {isModalOpen && (
        <div id="modal-container-guide" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          {/* Backdrop Cancel trigger */}
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 text-left animate-in zoom-in-95 duration-150 z-10">
            <h3 className="font-display font-medium text-lg text-pine border-none pb-2 mb-4 border-b border-gray-100">
              {editingGuide ? `Editar legajo: ${editingGuide.full_name}` : 'Registrar Nuevo Guía Corporativo'}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Nombre completo:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Clara Milanesi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    WhatsApp / Celular:
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: +56987654321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Email de contacto:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="clara@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>
              </div>

               <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Foto de perfil del guía:
                </label>
                <FileUpload 
                  onUpload={(base64) => setAvatarUrl(base64)} 
                  currentUrl={avatarUrl} 
                  placeholderText="Arrastra la foto de perfil o haz clic para subir"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Especialidades homologadas (separadas por comas):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Alta montaña, Rescate acuático, Paramédico, Geología"
                  value={specialtyStr}
                  onChange={(e) => setSpecialtyStr(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Separar cada credencial con una coma para que se generen tags visuales.</span>
              </div>

              {/* Status checkbox toggle */}
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="guide-active-chk"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-pine focus:ring-pine cursor-pointer"
                />
                <label htmlFor="guide-active-chk" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Habilitado para asignar salidas de terreno del día
                </label>
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-50 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-150 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pine text-white hover:bg-emerald-800 text-xs font-semibold rounded-xl cursor-pointer shadow-sm"
                >
                  {editingGuide ? 'Guardar Legajo' : 'Dar de Alta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
