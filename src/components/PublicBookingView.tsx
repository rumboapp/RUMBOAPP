/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { PublicDeparture } from '../types';
import { Clock, MapPin, Users, CalendarDays, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export default function PublicBookingView({ token }: { token: string }) {
  const [departure, setDeparture] = useState<PublicDeparture | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [paxCount, setPaxCount] = useState(1);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    (async () => {
      const data = await db.getPublicDeparture(token);
      if (!data) setNotFound(true);
      setDeparture(data);
      setLoading(false);
    })();
  }, [token]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(`${dateStr}T12:00:00`).toLocaleDateString('es-CL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!fullName.trim() || !phone.trim()) {
      setErrorMsg('Completa tu nombre y teléfono.');
      return;
    }
    setSubmitting(true);
    const res = await db.createBookingRequest(token, fullName.trim(), phone.trim(), paxCount, note.trim() || undefined);
    setSubmitting(false);
    if (res.success) {
      setSubmitted(true);
    } else {
      setErrorMsg(res.message || 'No se pudo enviar la solicitud.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sky flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pine animate-spin" />
      </div>
    );
  }

  if (notFound || !departure) {
    return (
      <div className="min-h-screen bg-sky flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8 max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="font-serif text-xl text-pine">Salida no encontrada</h1>
          <p className="text-xs text-gray-500 mt-2">Este enlace de reserva no existe o ya no está disponible. Contacta directamente a la agencia.</p>
        </div>
      </div>
    );
  }

  const closed = departure.status !== 'programada' || departure.spots_left <= 0;

  return (
    <div className="min-h-screen bg-sky py-8 px-4">
      <div className="max-w-lg mx-auto flex flex-col gap-5">
        {/* Header agencia */}
        <div className="flex items-center gap-3 justify-center">
          {departure.agency_logo && (
            <img src={departure.agency_logo} alt={departure.agency_name} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
          )}
          <div className="text-center">
            <p className="font-serif text-lg text-pine leading-tight">{departure.agency_name}</p>
            <p className="text-[10px] text-gray-400">{departure.agency_city}</p>
          </div>
        </div>

        {/* Card de la salida */}
        <div className="bg-white rounded-3xl shadow-card border border-gray-100 overflow-hidden">
          <div className="relative h-48 bg-gray-100">
            <img src={departure.activity_photo || 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800'} alt={departure.activity_name} className="w-full h-full object-cover" />
            <div className="absolute bottom-3 right-3 bg-black/75 text-white font-mono font-bold text-sm px-3 py-1 rounded-lg">
              {departure.price.toLocaleString('es-CL', { style: 'currency', currency: departure.currency || 'CLP', maximumFractionDigits: 0 })}
              <span className="text-[9px] font-sans font-normal opacity-80"> /persona</span>
            </div>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <h1 className="font-serif text-2xl text-pine">{departure.activity_name}</h1>
            <p className="text-xs text-gray-500">{departure.activity_description}</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <span className="flex items-center gap-1.5 text-[11px] bg-sky/60 px-2.5 py-1.5 rounded-lg font-semibold capitalize">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" /> {formatDate(departure.departure_date)}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] bg-sky/60 px-2.5 py-1.5 rounded-lg font-semibold">
                <Clock className="w-3.5 h-3.5 shrink-0" /> {departure.departure_time} hs · {departure.duration_minutes} min
              </span>
              <span className="flex items-center gap-1.5 text-[11px] bg-sky/60 px-2.5 py-1.5 rounded-lg font-semibold">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> {departure.meeting_point}
              </span>
              <span className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg font-semibold ${departure.spots_left <= 3 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                <Users className="w-3.5 h-3.5 shrink-0" /> {departure.spots_left > 0 ? `${departure.spots_left} cupos disponibles` : 'Sin cupos'}
              </span>
            </div>
          </div>
        </div>

        {/* Formulario / estados */}
        {submitted ? (
          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h2 className="font-serif text-xl text-pine">¡Solicitud enviada!</h2>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              <strong>{departure.agency_name}</strong> revisará tu solicitud y te contactará por WhatsApp al número que indicaste para confirmar tu reserva y coordinar el pago.
            </p>
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-4">
              Recuerda: tu reserva queda confirmada solo una vez realizado el pago.
            </p>
          </div>
        ) : closed ? (
          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="font-serif text-lg text-pine">{departure.spots_left <= 0 ? 'Sin cupos disponibles' : 'Reservas cerradas'}</h2>
            <p className="text-xs text-gray-500 mt-2">Esta salida ya no acepta reservas. Contacta a la agencia para conocer próximas fechas.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-card border border-gray-100 p-6 flex flex-col gap-4">
            <h2 className="font-serif text-lg text-pine">Reserva tu cupo</h2>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">Nombre completo *</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: María Pérez" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">Teléfono WhatsApp *</label>
              <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+56 9 1234 5678" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">Cantidad de personas *</label>
              <select value={paxCount} onChange={(e) => setPaxCount(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                {Array.from({ length: Math.min(departure.spots_left, 10) }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 block mb-1">Comentario (opcional)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Alguna consulta o información para la agencia"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm h-16 resize-none" />
            </div>

            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              ⚠️ Tu reserva queda confirmada solo una vez que la agencia la acepte y realices el pago. Te contactarán por WhatsApp.
            </p>

            {errorMsg && (
              <p className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{errorMsg}</p>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-pine text-white rounded-xl text-sm font-bold shadow-md cursor-pointer hover:bg-pine-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Enviando...' : 'Solicitar reserva'}
            </button>

            <p className="text-[9px] text-gray-400 text-center leading-relaxed">
              Tus datos (nombre y teléfono) se comparten solo con {departure.agency_name} para gestionar esta reserva.
            </p>
          </form>
        )}

        <p className="text-[9px] text-gray-400 text-center">Reservas gestionadas con <strong>Rumbo</strong> · rumboapp.cl</p>
      </div>
    </div>
  );
}
