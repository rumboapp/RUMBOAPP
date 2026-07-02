/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { PublicCatalog, PublicCatalogActivity } from '../types';
import { Clock, MapPin, Users, CalendarDays, CheckCircle2, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';

function DateRequestForm({ token, activity, onDone }: { token: string; activity: PublicCatalogActivity; onDone: () => void }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [paxCount, setPaxCount] = useState(1);
  const [requestedDate, setRequestedDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!fullName.trim() || !phone.trim() || !requestedDate) {
      setErrorMsg('Completa nombre, teléfono y fecha.');
      return;
    }
    setSubmitting(true);
    const res = await db.createDateRequest(token, activity.id, fullName.trim(), phone.trim(), paxCount, requestedDate, note.trim() || undefined);
    setSubmitting(false);
    if (res.success) {
      onDone();
    } else {
      setErrorMsg(res.message || 'No se pudo enviar la solicitud.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-gray-100 pt-4 mt-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Nombre completo *</label>
          <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Ej: María Pérez" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Teléfono WhatsApp *</label>
          <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="+56 9 1234 5678" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Fecha preferida *</label>
          <input type="date" required min={todayStr} value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Personas *</label>
          <select value={paxCount} onChange={(e) => setPaxCount(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs">
            {Array.from({ length: Math.min(activity.capacity_max, 10) }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-gray-500 block mb-1">Comentario (opcional)</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Horario preferido, consultas..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
      </div>
      {errorMsg && (
        <p className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{errorMsg}</p>
      )}
      <button type="submit" disabled={submitting}
        className="w-full py-2.5 bg-pine text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-pine-hover transition-colors disabled:opacity-50">
        {submitting ? 'Enviando...' : 'Enviar solicitud de fecha'}
      </button>
      <p className="text-[9px] text-gray-400 text-center">La agencia te contactará por WhatsApp para coordinar fecha, hora y pago.</p>
    </form>
  );
}

export default function PublicCatalogView({ token }: { token: string }) {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      setCatalog(await db.getPublicCatalog(token));
      setLoading(false);
    })();
  }, [token]);

  const formatShortDate = (dateStr: string) => {
    try {
      return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sky flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pine animate-spin" />
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-sky flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="font-serif text-xl text-pine">Catálogo no encontrado</h1>
          <p className="text-xs text-gray-500 mt-2">Este enlace no existe o ya no está disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky py-8 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header agencia */}
        <div className="flex flex-col items-center gap-2 text-center">
          {catalog.agency_logo && (
            <img src={catalog.agency_logo} alt={catalog.agency_name} className="w-16 h-16 rounded-2xl object-cover border border-gray-200 shadow-sm" />
          )}
          <div>
            <h1 className="font-serif text-3xl text-pine leading-tight">{catalog.agency_name}</h1>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {catalog.agency_city}</p>
          </div>
          <p className="text-xs text-gray-500 max-w-md">Elige una aventura: reserva una salida programada o solicita la fecha que te acomode.</p>
        </div>

        {catalog.activities.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 text-center text-gray-400 text-sm">
            Esta agencia aún no tiene actividades publicadas.
          </div>
        ) : catalog.activities.map(act => {
          const sent = sentIds.has(act.id);
          return (
            <div key={act.id} className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
              <div className="relative h-44 bg-gray-100">
                <img src={act.photo_url || 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800'} alt={act.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-3 right-3 bg-black/75 text-white font-mono font-bold text-sm px-3 py-1 rounded-lg">
                  {act.price.toLocaleString('es-CL', { style: 'currency', currency: act.currency || 'CLP', maximumFractionDigits: 0 })}
                  <span className="text-[9px] font-sans font-normal opacity-80"> /persona</span>
                </div>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div>
                  <h2 className="font-serif text-xl text-pine">{act.name}</h2>
                  <p className="text-xs text-gray-500 mt-1">{act.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="flex items-center gap-1 text-[10px] bg-sky/60 px-2 py-1 rounded-lg font-semibold">
                    <Clock className="w-3 h-3" /> {act.duration_minutes} min
                  </span>
                  <span className="flex items-center gap-1 text-[10px] bg-sky/60 px-2 py-1 rounded-lg font-semibold">
                    <Users className="w-3 h-3" /> Max {act.capacity_max} pax
                  </span>
                  <span className="flex items-center gap-1 text-[10px] bg-sky/60 px-2 py-1 rounded-lg font-semibold">
                    <MapPin className="w-3 h-3" /> {act.meeting_point}
                  </span>
                </div>

                {/* Salidas programadas con cupo */}
                {act.upcoming_departures.length > 0 && (
                  <div className="flex flex-col gap-1.5 border-t border-gray-50 pt-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Próximas salidas</p>
                    {act.upcoming_departures.slice(0, 5).map(dep => (
                      <a key={dep.public_token} href={`#/reservar/${dep.public_token}`}
                        className="flex items-center justify-between bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 transition-colors cursor-pointer group">
                        <span className="text-xs font-semibold text-gray-700 capitalize">{formatShortDate(dep.departure_date)} · {dep.departure_time} hs</span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          {dep.spots_left} cupos <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Solicitar otra fecha */}
                {sent ? (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-[11px] text-emerald-800 font-semibold">¡Solicitud enviada! La agencia te contactará por WhatsApp.</p>
                  </div>
                ) : openFormId === act.id ? (
                  <DateRequestForm token={token} activity={act}
                    onDone={() => { setSentIds(prev => new Set(prev).add(act.id)); setOpenFormId(null); }} />
                ) : (
                  <button onClick={() => setOpenFormId(act.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${act.upcoming_departures.length > 0
                      ? 'bg-white border border-pine/30 text-pine hover:bg-pine/5'
                      : 'bg-pine text-white hover:bg-pine-hover'}`}>
                    {act.upcoming_departures.length > 0 ? '¿Otra fecha? Solicítala aquí' : 'Solicitar fecha'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <p className="text-[9px] text-gray-400 text-center">Reservas gestionadas con <strong>Rumbo</strong> · rumboapp.cl</p>
      </div>
    </div>
  );
}
