/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth-context';
import { useNotification } from '../lib/notification-context';
import { Guide, AgencyMember, MockUser, AgencyRole } from '../types';
import { Plus, Edit, Trash2, Phone, Mail, Award, Check, X, Sparkles, UserCheck, Clipboard, Key, Users, Shield, UserX } from 'lucide-react';
import { FileUpload } from './FileUpload';

export default function GuidesView() {
  const { agency, isAdmin, user: currentUser } = useAuth();
  const { notifyWarning, confirmAction } = useNotification();
  const agencyId = agency?.id || '';

  const [guides, setGuides] = useState<Guide[]>([]);
  const [members, setMembers] = useState<{ member: AgencyMember; user: MockUser }[]>([]);
  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialtyStr, setSpecialtyStr] = useState('');
  const [active, setActive] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState('');

  const loadData = async () => {
    if (!agencyId) return;
    setGuides(await db.getGuides(agencyId));
    setMembers(await db.getMembers(agencyId));
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

  const openAddModal = async () => {
    const currentPlan = agency?.subscription_plan || 'free';
    const planLimits = { free: 2, premium: 20, pro: 100 };
    const limit = planLimits[currentPlan as keyof typeof planLimits] || 2;
    if (guides.length >= limit) {
      const wantsToSeePlans = await confirmAction({
        title: 'Límite de tu plan alcanzado',
        message: `Tu plan ${currentPlan} permite hasta ${limit} guías. ¿Quieres ver los planes disponibles?`,
        confirmLabel: 'Ver planes',
      });
      if (wantsToSeePlans) {
        window.dispatchEvent(new Event('rumbo_open_pricing'));
      }
      return;
    }
    setEditingGuide(null);
    setFullName(''); setPhone(''); setEmail(''); setSpecialtyStr(''); setActive(true); setAvatarUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (g: Guide) => {
    setEditingGuide(g);
    setFullName(g.full_name); setPhone(g.phone); setEmail(g.email);
    setSpecialtyStr(g.specialties.join(', ')); setActive(g.active); setAvatarUrl(g.avatar_url || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone || !email) { notifyWarning('Completa todos los campos.'); return; }
    const specialtiesList = specialtyStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const payload = { user_id: editingGuide ? editingGuide.user_id : null, full_name: fullName, phone, email, specialties: specialtiesList.length > 0 ? specialtiesList : ['Turismo General'], active, avatar_url: avatarUrl };
    if (editingGuide) {
      await db.updateGuide(editingGuide.id, payload);
    } else {
      await db.createGuide(agencyId, payload);
    }
    setIsModalOpen(false);
    await loadData();
  };

  const handleDeleteGuide = async (id: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Eliminar guía',
      message: `¿Quieres eliminar a ${name}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (confirmed) {
      await db.deleteGuide(id);
      await loadData();
    }
  };

  const handleToggleActive = async (g: Guide) => {
    await db.updateGuide(g.id, { active: !g.active });
    await loadData();
  };

  const handleToggleAdmin = async (g: Guide) => {
    if (!isAdmin) { notifyWarning('Solo admins pueden modificar privilegios.'); return; }
    if (!g.user_id) { notifyWarning('Solo guías vinculados pueden ser admins.'); return; }
    const targetMember = members.find(m => m.user.id === g.user_id);
    if (!targetMember) return;
    if (targetMember.user.id === currentUser?.id) { notifyWarning('No puedes cambiarte a ti mismo.'); return; }
    const nextRole = targetMember.member.role === AgencyRole.ADMIN ? AgencyRole.GUIA : AgencyRole.ADMIN;
    const confirmed = await confirmAction(
      nextRole === AgencyRole.ADMIN ? `¿Ascender a ${g.full_name} a Admin?` : `¿Degradar a ${g.full_name} a Guía?`
    );
    if (confirmed) {
      await db.updateMemberRole(targetMember.member.id, nextRole);
      await loadData();
    }
  };

  const handleRemoveFromAgency = async (g: Guide) => {
    if (g.user_id && g.user_id === currentUser?.id) { notifyWarning('No puedes eliminarte a ti mismo.'); return; }
    const confirmed = await confirmAction({
      title: 'Desvincular guía',
      message: `¿Quieres desvincular a ${g.full_name} de la agencia?`,
      confirmLabel: 'Desvincular',
      destructive: true,
    });
    if (confirmed) {
      await db.deleteGuide(g.id);
      if (g.user_id) {
        const targetMember = members.find(m => m.user.id === g.user_id);
        if (targetMember) await db.deleteMember(targetMember.member.id);
      }
      await loadData();
    }
  };

  const pendingRequests = guides.filter(g => !g.active && g.user_id);
  const activePlantel = guides.filter(g => g.active || !g.user_id);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-1 sm:px-4">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white rounded-2xl p-5 border border-gray-100 shadow-card">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium text-pine">Equipo de Guías</h1>
          <p className="text-xs text-gray-400 mt-1">Reclutamiento y gestión de guías.</p>
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            <span className="font-semibold text-gray-500 bg-gray-50 border px-2.5 py-0.5 rounded-full">
              {guides.length} de {agency?.subscription_plan === 'pro' ? 100 : agency?.subscription_plan === 'premium' ? 20 : 2}
            </span>
            <button onClick={() => window.dispatchEvent(new Event('rumbo_open_pricing'))} className="text-pine font-bold hover:underline flex items-center gap-0.5 cursor-pointer transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Subir de Plan
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm">
            <h3 className="font-semibold text-pine flex items-center gap-2 text-md"><Key className="w-5 h-5 text-orange-500" /> Código de Invitación</h3>
            <p className="text-xs text-gray-500 mt-2">Comparte este código con tus guías:</p>
            <div className="bg-sky/50 border border-sky/80 rounded-2xl p-4 flex items-center justify-between mt-3">
              <span className="text-2xl font-mono font-black text-pine tracking-wider">{agency?.join_code}</span>
              <button onClick={handleCopyCode} className="px-4 py-2 bg-pine text-white font-semibold rounded-xl text-xs cursor-pointer hover:bg-pine-hover transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 inline" /> : <Clipboard className="w-3.5 h-3.5 inline" />} Copiar
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          {pendingRequests.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-gray-800 text-md flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> Solicitudes Pendientes
                <span className="text-[11px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">{pendingRequests.length}</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingRequests.map((g) => (
                  <div key={g.id} className="p-4 bg-amber-50/20 border border-amber-200/50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      {g.avatar_url ? <img src={g.avatar_url} alt={g.full_name} className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center">{g.full_name.substr(0,2).toUpperCase()}</div>}
                      <div><h4 className="text-xs font-bold">{g.full_name}</h4><p className="text-[10px] text-gray-500">{g.email}</p></div>
                    </div>
                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-1.5 mt-3">
                        <button onClick={() => handleRemoveFromAgency(g)} className="py-1.5 bg-gray-100 text-gray-800 rounded-lg text-[10px] font-bold cursor-pointer hover:bg-gray-200 transition-colors"><UserX className="w-3 h-3 inline" /> Rechazar</button>
                        <button onClick={() => handleToggleActive(g)} className="py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-emerald-700 transition-colors"><Check className="w-3 h-3 inline" /> Aprobar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-gray-800 text-md flex items-center gap-2"><Users className="w-4 h-4 text-pine" /> Guías Activos <span className="text-xs px-2 py-0.5 bg-sky text-ocean rounded-full font-bold">{activePlantel.length}</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activePlantel.length === 0 ? (
                <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-3xl border border-gray-100">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-semibold">No hay guías activos</p>
                </div>
              ) : activePlantel.map((g) => {
                const isSelf = g.user_id && g.user_id === currentUser?.id;
                const matchingMember = g.user_id ? members.find(m => m.user.id === g.user_id) : null;
                const role = matchingMember?.member.role || AgencyRole.GUIA;
                return (
                  <div key={g.id} className={`bg-white rounded-2xl border p-5 shadow-xs ${g.active ? 'border-gray-150' : 'border-gray-250 bg-gray-50/50 opacity-75'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {g.avatar_url ? <img src={g.avatar_url} alt={g.full_name} className="w-11 h-11 rounded-xl object-cover" /> : <div className="w-11 h-11 rounded-xl bg-sky text-ocean font-bold flex items-center justify-center">{g.full_name.split(' ').map(n => n[0]).join('').substr(0,2).toUpperCase()}</div>}
                        <div>
                          <h4 className="font-bold text-xs">{g.full_name} {isSelf && <span className="text-[8px] bg-slate-900 text-white px-1 rounded">Tú</span>}</h4>
                          <span className={`text-[8.5px] font-bold px-1.5 rounded border ${role === AgencyRole.ADMIN ? 'bg-orange-50 text-orange-800' : 'bg-indigo-50 text-indigo-700'}`}>{role === AgencyRole.ADMIN ? '👑 Admin' : '🧭 Guía'}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-0.5">
                          <button onClick={() => openEditModal(g)} className="p-1 text-gray-400 hover:text-pine cursor-pointer transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleRemoveFromAgency(g)} className="p-1 text-gray-400 hover:text-red-600 cursor-pointer transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.specialties.map((s, idx) => <span key={idx} className="text-[8.5px] font-bold bg-sky/50 text-ocean px-1.5 py-0.5 rounded-md"><Award className="w-2.5 h-2.5 inline" /> {s}</span>)}
                    </div>
                    <div className="border-t border-gray-100 pt-2 mt-2 text-xs text-gray-500">
                      <p><Phone className="w-3.5 h-3.5 inline" /> {g.phone}</p>
                      <p><Mail className="w-3.5 h-3.5 inline" /> {g.email}</p>
                    </div>
                    {isAdmin && g.user_id && !isSelf && (
                      <button onClick={() => handleToggleAdmin(g)} className="mt-2 text-[10px] font-bold text-pine border border-gray-150 px-2 py-1 rounded-lg cursor-pointer hover:bg-pine/5 transition-colors">
                        <Shield className="w-3 h-3 inline" /> {role === AgencyRole.ADMIN ? 'Hacer Guía' : 'Hacer Admin'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10">
            <h3 className="font-display font-medium text-lg text-pine mb-4">{editingGuide ? 'Editar' : 'Nuevo'} Guía</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="text" required placeholder="Nombre" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" required placeholder="WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              </div>
              <FileUpload onUpload={(url) => setAvatarUrl(url)} currentUrl={avatarUrl} placeholderText="Foto de perfil" folder="avatars" />
              <input type="text" placeholder="Especialidades (separadas por coma)" value={specialtyStr} onChange={(e) => setSpecialtyStr(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded text-pine" /><span className="text-xs font-semibold">Activo</span></label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-pine text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-pine-hover transition-colors">{editingGuide ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
