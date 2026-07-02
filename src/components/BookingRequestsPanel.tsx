/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth-context';
import { useNotification } from '../lib/notification-context';
import { BookingRequest, Departure, Activity } from '../types';
import { getBookingConfirmationLink, cleanPhoneNumber } from '../lib/whatsapp';
import { Inbox, Check, X, Users, Phone, CalendarSearch } from 'lucide-react';

export default function BookingRequestsPanel() {
  const { agency, isAdmin } = useAuth();
  const { notifySuccess, confirmAction } = useNotification();
  const agencyId = agency?.id || '';

  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  const loadData = async () => {
    if (!agencyId) return;
    const [reqs, deps, acts] = await Promise.all([
      db.getBookingRequests(agencyId),
      db.getDepartures(agencyId),
      db.getActivities(agencyId)
    ]);
    setRequests(reqs);
    setDepartures(deps);
    setActivities(acts);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('rumbo_db_updated', loadData);
    return () => window.removeEventListener('rumbo_db_updated', loadData);
  }, [agencyId]);

  if (!isAdmin) return null;

  const now = new Date().toISOString();
  const pending = requests.filter(r => r.status === 'pending' && r.expires_at > now);
  if (pending.length === 0) return null;

  const isDateRequest = (req: BookingRequest) => !req.departure_id;

  const describeDateRequest = (req: BookingRequest) => {
    const act = activities.find(a => a.id === req.activity_id);
    let dateStr = req.requested_date || '';
    const parts = dateStr.split('-');
    if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}`;
    return { label: `${act?.name || 'Actividad'} — fecha solicitada: ${dateStr}`, act };
  };

  // Al aceptar una solicitud de fecha se abre WhatsApp para coordinar;
  // la salida y el pasajero los crea el admin manualmente después.
  const handleAcceptDateRequest = async (req: BookingRequest) => {
    const { act } = describeDateRequest(req);
    setResolving(req.id);
    const ok = await db.resolveBookingRequest(req.id, 'confirmed');
    setResolving(null);
    if (!ok) return;
    notifySuccess('Solicitud aceptada. Coordina fecha y hora por WhatsApp y luego agenda la salida en el calendario.');
    let dateStr = req.requested_date || '';
    const parts = dateStr.split('-');
    if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}`;
    const text = `Hola *${req.full_name}*, te escribimos de *${agency?.name || 'Rumbo'}* 🌄

Recibimos tu solicitud para *${act?.name || 'nuestra actividad'}* el día *${dateStr}* (${req.pax_count} persona/s) y ¡nos encantaría coordinarla contigo!

¿Te acomoda esa fecha? Cuéntanos tu horario preferido y te confirmamos la salida con las instrucciones de pago.`;
    window.open(`https://wa.me/${cleanPhoneNumber(req.phone)}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const describeDeparture = (departureId: string) => {
    const dep = departures.find(d => d.id === departureId);
    if (!dep) return { label: 'Salida eliminada', dep: null, act: null };
    const act = activities.find(a => a.id === dep.activity_id);
    let dateStr = dep.departure_date;
    const parts = dep.departure_date.split('-');
    if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}`;
    return { label: `${act?.name || 'Actividad'} — ${dateStr} ${dep.departure_time}hs`, dep, act };
  };

  const handleConfirm = async (req: BookingRequest) => {
    if (isDateRequest(req)) {
      await handleAcceptDateRequest(req);
      return;
    }
    const { dep, act } = describeDeparture(req.departure_id!);
    if (!dep || !act) return;
    setResolving(req.id);

    // Crear el pasajero real a partir de la solicitud
    await db.createPassenger({
      departure_id: dep.id,
      full_name: req.full_name,
      phone: req.phone,
      pax_count: req.pax_count,
      checked_in: false,
      payment_status: 'pendiente',
      notes: req.note ? `Reserva web: ${req.note}` : 'Reserva web'
    });
    const ok = await db.resolveBookingRequest(req.id, 'confirmed');
    setResolving(null);
    if (!ok) return;

    notifySuccess(`Reserva de ${req.full_name} confirmada y pasajero creado.`);
    // Abrir WhatsApp con la confirmación + datos de pago de la agencia
    const waLink = getBookingConfirmationLink(
      req.full_name, req.phone, act.name, dep.departure_date, dep.departure_time,
      agency?.name || 'Rumbo', agency?.payment_info
    );
    window.open(waLink, '_blank');
  };

  const handleReject = async (req: BookingRequest) => {
    const confirmed = await confirmAction({
      title: 'Rechazar solicitud',
      message: `¿Rechazar la solicitud de ${req.full_name} (${req.pax_count} cupo/s)? El cupo quedará liberado.`,
      confirmLabel: 'Rechazar',
      destructive: true,
    });
    if (!confirmed) return;
    setResolving(req.id);
    await db.resolveBookingRequest(req.id, 'rejected');
    setResolving(null);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-card">
      <h3 className="font-semibold text-pine text-md flex items-center gap-2">
        <Inbox className="w-5 h-5 text-amber-600" /> Solicitudes de reserva
        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{pending.length} pendiente{pending.length > 1 ? 's' : ''}</span>
      </h3>
      <p className="text-[10px] text-gray-400 mt-0.5">Reservas hechas desde tus links públicos. Al confirmar se crea el pasajero y se abre WhatsApp con las instrucciones de pago.</p>
      <div className="flex flex-col divide-y divide-gray-50 mt-3">
        {pending.map(req => {
          const { label } = isDateRequest(req) ? describeDateRequest(req) : describeDeparture(req.departure_id!);
          return (
            <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  {req.full_name}
                  {isDateRequest(req) && (
                    <span className="flex items-center gap-0.5 text-[8.5px] bg-indigo-50 text-indigo-700 border px-1.5 py-0.5 rounded font-bold">
                      <CalendarSearch className="w-3 h-3" /> Solicitud de fecha
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-gray-500 truncate">{label}</p>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {req.pax_count} pax</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {req.phone}</span>
                </div>
                {req.note && <p className="text-[10px] text-gray-400 italic mt-1">"{req.note}"</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleConfirm(req)} disabled={resolving === req.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-pine text-white rounded-xl text-[10px] font-bold cursor-pointer hover:bg-pine-hover transition-colors disabled:opacity-50">
                  <Check className="w-3.5 h-3.5" /> Confirmar
                </button>
                <button onClick={() => handleReject(req)} disabled={resolving === req.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-500 border rounded-xl text-[10px] font-bold cursor-pointer hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50">
                  <X className="w-3.5 h-3.5" /> Rechazar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
