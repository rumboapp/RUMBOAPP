/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth-context';
import { useNotification } from '../lib/notification-context';
import { Activity } from '../types';
import { Plus, Edit, Trash2, Clock, Users, Sparkles, Lock } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { WhatsappTemplateEditor } from './WhatsappTemplateEditor';

export default function ActivitiesView() {
  const { agency, isAdmin } = useAuth();
  const { notifyWarning, confirmAction } = useNotification();
  const agencyId = agency?.id || '';

  const [activities, setActivities] = useState<Activity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(120);
  const [price, setPrice] = useState(50000);
  const [currency, setCurrency] = useState('CLP');
  const [capacity, setCapacity] = useState(15);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [active, setActive] = useState(true);
  const [wspTemplate, setWspTemplate] = useState('');
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const isFreePlan = (agency?.subscription_plan || 'free') === 'free';

  const loadActivities = async () => {
    if (!agencyId) return;
    const list = await db.getActivities(agencyId);
    setActivities(list);
  };

  useEffect(() => {
    loadActivities();
    window.addEventListener('rumbo_db_updated', loadActivities);
    return () => window.removeEventListener('rumbo_db_updated', loadActivities);
  }, [agencyId]);

  const openAddModal = async () => {
    const currentPlan = agency?.subscription_plan || 'free';
    const planLimits = { free: 3, premium: 10, pro: 50 };
    const limit = planLimits[currentPlan as keyof typeof planLimits] || 3;
    if (activities.length >= limit) {
      const wantsToSeePlans = await confirmAction({
        title: 'Límite de tu plan alcanzado',
        message: `Tu plan ${currentPlan} permite hasta ${limit} actividades. ¿Quieres ver los planes disponibles?`,
        confirmLabel: 'Ver planes',
      });
      if (wantsToSeePlans) {
        window.dispatchEvent(new Event('rumbo_open_pricing'));
      }
      return;
    }
    setEditingActivity(null);
    setName(''); setDescription(''); setDuration(120); setPrice(50000); setCurrency('CLP');
    setCapacity(15); setMeetingPoint(''); setPhotoUrl(''); setActive(true); setWspTemplate('');
    setIsPhotoUploading(false);
    setIsModalOpen(true);
  };

  const openEditModal = (act: Activity) => {
    setEditingActivity(act);
    setName(act.name); setDescription(act.description); setDuration(act.duration_minutes);
    setPrice(act.price); setCurrency(act.currency); setCapacity(act.capacity_max);
    setMeetingPoint(act.meeting_point); setPhotoUrl(act.photo_url); setActive(act.active);
    setWspTemplate(act.whatsapp_template || '');
    setIsPhotoUploading(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !meetingPoint) {
      notifyWarning('Completa todos los campos requeridos.');
      return;
    }
    if (isPhotoUploading) {
      notifyWarning('Espera a que la foto termine de subirse antes de guardar.');
      return;
    }
    const payload = { name, description, duration_minutes: Number(duration), price: Number(price), currency, capacity_max: Number(capacity), meeting_point: meetingPoint, photo_url: photoUrl, active, whatsapp_template: isFreePlan ? '' : wspTemplate };
    if (editingActivity) {
      await db.updateActivity(editingActivity.id, payload);
    } else {
      await db.createActivity(agencyId, payload);
    }
    setIsModalOpen(false);
    await loadActivities();
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAction({
      title: 'Eliminar actividad',
      message: `¿Quieres eliminar "${name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (confirmed) {
      await db.deleteActivity(id);
      await loadActivities();
    }
  };

  const handleToggleActive = async (act: Activity) => {
    await db.updateActivity(act.id, { active: !act.active });
    await loadActivities();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-1 sm:px-4">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white rounded-2xl p-5 border border-gray-100 shadow-card">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-pine">Catálogo de Actividades</h1>
          <p className="text-xs text-gray-400 mt-1">Define excursiones, precios y capacidades.</p>
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            <span className="font-semibold text-gray-500 bg-gray-50 border px-2.5 py-0.5 rounded-full">
              {activities.length} de {agency?.subscription_plan === 'pro' ? 50 : agency?.subscription_plan === 'premium' ? 10 : 3}
            </span>
            {isAdmin && (
              <button onClick={() => window.dispatchEvent(new Event('rumbo_open_pricing'))}
                className="text-pine font-bold hover:underline flex items-center gap-0.5 cursor-pointer transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Subir de Plan
              </button>
            )}
          </div>
        </div>
        {isAdmin && (
          <button onClick={openAddModal} className="flex items-center gap-1.5 px-4 py-2.5 bg-pine text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer hover:bg-pine-hover hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" /> Crear Actividad
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-3xl border border-gray-100">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold">Tu catálogo está vacío</p>
          </div>
        ) : activities.map((act) => (
          <div key={act.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-card transition-all ${act.active ? 'border-gray-100' : 'border-gray-200 bg-gray-50/50 opacity-75'}`}>
            <div className="relative h-44 bg-gray-100 overflow-hidden">
              <img src={act.photo_url || 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=600'} alt={act.name} className="w-full h-full object-cover" />
              <button onClick={() => isAdmin && handleToggleActive(act)} disabled={!isAdmin}
                className={`absolute top-3 left-3 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full shadow-sm transition-transform ${isAdmin ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'} ${act.active ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {act.active ? '● Activa' : '○ Pausada'}
              </button>
              <div className="absolute bottom-3 right-3 bg-black/75 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                {act.price.toLocaleString('es-CL', { style: 'currency', currency: act.currency, maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-semibold text-pine text-md">{act.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-3 mt-1">{act.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-gray-50 pt-3">
                <span className="flex items-center gap-1 text-[10px] bg-sky/60 px-2 py-0.5 rounded-lg font-semibold font-mono">
                  <Clock className="w-3.5 h-3.5" /> {act.duration_minutes} min
                </span>
                <span className="flex items-center gap-1 text-[10px] bg-sky/60 px-2 py-0.5 rounded-lg font-semibold font-mono">
                  <Users className="w-3.5 h-3.5" /> Max {act.capacity_max} pax
                </span>
              </div>
              <p className="text-[10px] text-gray-400">Punto: {act.meeting_point}</p>
              {isAdmin && (
                <div className="flex gap-2 justify-end border-t border-gray-50 pt-3">
                  <button onClick={() => openEditModal(act)} className="p-2 bg-gray-50 text-ocean rounded-xl border cursor-pointer hover:bg-ocean/10 transition-colors"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(act.id, act.name)} className="p-2 bg-gray-50 text-gray-400 hover:text-red-600 rounded-xl border cursor-pointer hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 z-10 my-8">
            <h3 className="font-display font-medium text-lg text-pine mb-4">{editingActivity ? 'Editar' : 'Nueva'} Actividad</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="text" required placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              <textarea required placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs h-20 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1">Duración (minutos)</label>
                  <input type="number" required min={30} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" placeholder="Duración (min)" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1">Capacidad máxima (pax)</label>
                  <input type="number" required min={1} max={100} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" placeholder="Capacidad" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-semibold text-gray-500 block mb-1">Precio</label>
                  <input type="number" required min={100} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" placeholder="Precio" />
                </div>
                <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Moneda</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs">
                  <option value="CLP">CLP</option><option value="ARS">ARS</option><option value="USD">USD</option>
                </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Punto de encuentro</label>
              <input type="text" required placeholder="Punto de encuentro" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div className="relative">
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Plantilla WhatsApp de esta actividad (opcional)</label>
                <WhatsappTemplateEditor value={wspTemplate} onChange={setWspTemplate} disabled={isFreePlan} />
                <p className="text-[9px] text-gray-400 mt-1">Si la dejas vacía, se usa la plantilla general de la agencia (o el mensaje sugerido).</p>
                {isFreePlan && (
                  <div className="absolute inset-x-0 bottom-0 top-[16px] bg-white/70 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center text-center p-2 border border-dashed border-gray-200">
                    <Lock className="w-4 h-4 text-pine mb-1" />
                    <p className="text-[10px] text-gray-600 font-semibold">Personalizar mensajes por actividad requiere Plan Premium o Pro.</p>
                    <button type="button" onClick={() => { setIsModalOpen(false); window.dispatchEvent(new Event('rumbo_open_pricing')); }}
                      className="mt-1.5 px-3 py-1 bg-pine text-white font-bold rounded-lg text-[9px] cursor-pointer hover:bg-pine-hover transition-colors">Mejorar plan</button>
                  </div>
                )}
              </div>
              <div>
                <FileUpload onUpload={(url) => setPhotoUrl(url)} currentUrl={photoUrl} placeholderText="Foto de la actividad" folder="activities" onUploadingChange={setIsPhotoUploading} />
                <input type="text" placeholder="O URL directa" value={photoUrl.startsWith('data:image/') ? '' : photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={isPhotoUploading} className="px-4 py-2 bg-pine text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-pine-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isPhotoUploading ? 'Subiendo foto...' : (editingActivity ? 'Guardar' : 'Crear')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
