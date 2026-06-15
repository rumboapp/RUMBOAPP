/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth-context';
import { Activity } from '../types';
import { Plus, Edit, Trash2, Clock, Users, ArrowRight, X, Heart, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { FileUpload } from './FileUpload';

export default function ActivitiesView() {
  const { agency, isAdmin } = useAuth();
  const agencyId = agency?.id || '';

  const [activities, setActivities] = useState<Activity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(120);
  const [price, setPrice] = useState(50000);
  const [currency, setCurrency] = useState('CLP');
  const [capacity, setCapacity] = useState(15);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [active, setActive] = useState(true);

  const loadActivities = () => {
    if (!agencyId) return;
    const list = db.getActivities(agencyId);
    setActivities(list);
  };

  useEffect(() => {
    loadActivities();
    window.addEventListener('rumbo_db_updated', loadActivities);
    return () => window.removeEventListener('rumbo_db_updated', loadActivities);
  }, [agencyId]);

  const openAddModal = () => {
    const currentPlan = agency?.subscription_plan || 'free';
    const planLimits = { free: 3, premium: 10, pro: 50 };
    const limit = planLimits[currentPlan as keyof typeof planLimits] || 3;
    
    if (activities.length >= limit) {
      if (confirm(`Has alcanzado el límite de tu Plan ${currentPlan === 'free' ? 'Gratuito' : currentPlan} (${limit} actividades). ¿Deseas ver los planes de suscripción para expandir tu cupo?`)) {
        window.dispatchEvent(new Event('rumbo_open_pricing'));
      }
      return;
    }

    setEditingActivity(null);
    setName('');
    setDescription('');
    setDuration(120);
    setPrice(50000);
    setCurrency('CLP');
    setCapacity(15);
    setMeetingPoint('');
    setPhotoUrl('');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (act: Activity) => {
    setEditingActivity(act);
    setName(act.name);
    setDescription(act.description);
    setDuration(act.duration_minutes);
    setPrice(act.price);
    setCurrency(act.currency);
    setCapacity(act.capacity_max);
    setMeetingPoint(act.meeting_point);
    setPhotoUrl(act.photo_url);
    setActive(act.active);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !meetingPoint) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }

    const payload = {
      name,
      description,
      duration_minutes: Number(duration),
      price: Number(price),
      currency,
      capacity_max: Number(capacity),
      meeting_point: meetingPoint,
      photo_url: photoUrl,
      active
    };

    if (editingActivity) {
      db.updateActivity(editingActivity.id, payload);
    } else {
      db.createActivity(agencyId, payload);
    }

    setIsModalOpen(false);
    loadActivities();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar "${name}"? Esta acción también cancelará las salidas futuras ligadas.`)) {
      db.deleteActivity(id);
      loadActivities();
    }
  };

  const handleToggleActive = (act: Activity) => {
    db.updateActivity(act.id, { active: !act.active });
    loadActivities();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-1 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white rounded-2xl p-5 border border-gray-100 shadow-card">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium text-pine">
            Catálogo de Actividades
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Define la oferta turística, duración, precios y capacidades máximas por excursión.
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px]">
            <span className="font-semibold text-gray-505 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-full">
              Cupo de Actividades: <strong className="text-pine font-mono">{activities.length}</strong> de <strong className="font-mono">{agency?.subscription_plan === 'pro' ? '50 (Pro)' : agency?.subscription_plan === 'premium' ? '10 (Premium)' : '3 (Gratuito)'}</strong>
            </span>
            <button 
              type="button"
              onClick={() => window.dispatchEvent(new Event('rumbo_open_pricing'))}
              className="text-pine font-bold hover:underline cursor-pointer flex items-center gap-0.5 animate-pulse"
              title="Ver Planes"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 inline" /> Subir de Plan
            </button>
          </div>
        </div>

        {isAdmin && (
          <button
            id="btn-add-activity"
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-pine hover:bg-pine/95 hover:shadow-pop text-white rounded-xl text-xs font-semibold cursor-pointer shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Crear Actividad
          </button>
        )}
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-3xl border border-gray-100">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold">Tu catálogo de excursiones está vacío</p>
            <p className="text-xs text-sm text-gray-400 mt-1">
              Agrega tu primera excursión de senderismo, rafting o canotaje para armar salidas.
            </p>
          </div>
        ) : (
          activities.map((act) => (
            <div
              key={act.id}
              className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-card transition-all flex flex-col justify-between ${
                act.active ? 'border-gray-100' : 'border-gray-200 bg-gray-50/50 opacity-75'
              }`}
            >
              {/* Cover Photo */}
              <div className="relative h-44 bg-gray-100 overflow-hidden">
                <img
                  src={act.photo_url || 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=600'}
                  alt={act.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                
                {/* Active marker status */}
                <button
                  onClick={() => isAdmin && handleToggleActive(act)}
                  disabled={!isAdmin}
                  className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm cursor-pointer ${
                    act.active 
                      ? 'bg-emerald-600 text-white border-transparent' 
                      : 'bg-gray-200 text-gray-600 border-gray-300'
                  }`}
                  title={isAdmin ? "Haga clic para encender o apagar" : undefined}
                >
                  {act.active ? '● Activa' : '○ Pausada'}
                </button>

                <div className="absolute bottom-3 right-3 bg-black/75 text-white font-mono font-bold text-xs px-2.5 py-1 rounded-lg backdrop-blur-xs">
                  {act.price.toLocaleString(act.currency === 'CLP' ? 'es-CL' : 'es-AR', { style: 'currency', currency: act.currency, maximumFractionDigits: 0 })}
                </div>
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-pine text-md leading-tight border-none select-none">
                    {act.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-3 mt-1.5 leading-relaxed">
                    {act.description}
                  </p>
                </div>

                {/* Meta details badge row */}
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
                  <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-sky/60 px-2 py-0.5 rounded-lg font-semibold font-mono">
                    <Clock className="w-3.5 h-3.5 text-ocean" /> {act.duration_minutes} min
                  </span>
                  
                  <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-sky/60 px-2 py-0.5 rounded-lg font-semibold font-mono">
                    <Users className="w-3.5 h-3.5 text-ocean" /> Max {act.capacity_max} pax
                  </span>
                </div>

                <div className="text-left py-1 text-[10px] font-semibold text-gray-400">
                  <span className="text-gray-500">Punto Encuentro:</span> {act.meeting_point}
                </div>

                {/* Operations buttons (Edit/Delete) */}
                {isAdmin && (
                  <div className="flex gap-2 justify-end border-t border-gray-50 pt-3 mt-1">
                    <button
                      onClick={() => openEditModal(act)}
                      className="p-2 bg-gray-50 hover:bg-sky text-ocean hover:text-pine rounded-xl border border-gray-200/50 cursor-pointer transition-colors"
                      title="Editar ficha"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(act.id, act.name)}
                      className="p-2 bg-gray-50 hover:bg-rose-50 text-gray-405 hover:text-red-650 rounded-xl border border-gray-200/50 cursor-pointer transition-colors"
                      title="Eliminar del catálogo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: CREATE / EDIT ACTIVITY */}
      {isModalOpen && (
        <div id="modal-container-act" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          {/* Backdrop Cancel trigger */}
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />

          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 text-left animate-in zoom-in-95 duration-150 z-10">
            <h3 className="font-display font-medium text-lg text-pine border-none pb-2 mb-4 border-b border-gray-100">
              {editingActivity ? `Editar Actividad: ${editingActivity.name}` : 'Crear Nueva Actividad de Aventura'}
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Nombre descriptivo:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Rafting Extremo Río Manso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Descripción resumida para guías y folletos:
                </label>
                <textarea
                  required
                  placeholder="Explica de qué trata la aventura, el río, la montaña o los requisitos..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none h-20 resize-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Duración estimada (minutos):
                  </label>
                  <input
                    type="number"
                    required
                    min={30}
                    max={2000}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Capacidad máxima (Pasajeros):
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Precio por persona:
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Moneda:
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="CLP">CLP (Ch$)</option>
                    <option value="ARS">ARS ($)</option>
                    <option value="USD">USD (US$)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Punto de encuentro / Coordinación:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Base del Cerro López, Circuito Chico o pick up en hotel"
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Foto de la actividad:
                </label>
                <div className="flex flex-col gap-2">
                  <FileUpload 
                    onUpload={(base64) => setPhotoUrl(base64)} 
                    currentUrl={photoUrl} 
                    placeholderText="Arrastra la foto de la actividad o haz clic"
                  />
                  <input
                    type="text"
                    placeholder="O ingresa un enlace web directo de imagen (opcional)"
                    value={photoUrl.startsWith('data:image/') ? '' : photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>
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
                  className="px-4 py-2 bg-pine text-white hover:bg-pine-hover text-xs font-semibold rounded-xl cursor-pointer shadow-sm"
                >
                  {editingActivity ? 'Guardar Cambios' : 'Ingresar Actividad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
