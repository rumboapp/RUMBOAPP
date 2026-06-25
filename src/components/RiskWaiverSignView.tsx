/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useNotification } from '../lib/notification-context';
import { Passenger, Departure, Activity } from '../types';
import { ShieldCheck, PenTool, Check } from 'lucide-react';

interface RiskWaiverSignViewProps {
  passengerId: string;
}

export default function RiskWaiverSignView({ passengerId }: RiskWaiverSignViewProps) {
  const { notifyWarning } = useNotification();
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [departure, setDeparture] = useState<Departure | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [signature, setSignature] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      const p = await db.getPassenger(passengerId);
      if (!p) { setLoadError(true); return; }
      setPassenger(p);
      const d = await db.getDeparture(p.departure_id);
      if (d) setDeparture(d);
      if (d) {
        const a = await db.getActivity(d.activity_id);
        if (a) setActivity(a);
      }
      return;
    }

    const { data, error } = await supabase.rpc('get_passenger_for_signature', { p_passenger_id: passengerId });
    if (error || !data) { setLoadError(true); return; }
    setPassenger(data.passenger);
    setDeparture(data.departure);
    setActivity(data.activity);
  };

  useEffect(() => {
    loadData();
  }, [passengerId]);

  const handleSign = async () => {
    if (!signature.trim()) { notifyWarning('Por favor ingresa tu nombre completo como firma.'); return; }
    setIsSubmitting(true);
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('sign_risk_waiver', { p_passenger_id: passengerId, p_signature: signature });
      if (error) {
        notifyWarning('No se pudo registrar la firma. Intenta nuevamente.');
        setIsSubmitting(false);
        return;
      }
    } else {
      await db.updatePassenger(passengerId, {
        signed_risk_waiver: true,
        signature_data: signature,
        signed_at: new Date().toISOString()
      });
    }
    setIsSigned(true);
    setIsSubmitting(false);
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#E8F1F7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-sm">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-500">No pudimos cargar esta declaración de riesgo.</p>
          <p className="text-xs text-gray-400 mt-2">El enlace puede haber expirado o ser inválido. Contacta a la agencia para que te reenvíe el link.</p>
        </div>
      </div>
    );
  }

  if (!passenger || !departure || !activity) {
    return (
      <div className="min-h-screen bg-[#E8F1F7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center">
          <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-400">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (isSigned || passenger.signed_risk_waiver) {
    return (
      <div className="min-h-screen bg-[#E8F1F7] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-display font-bold text-emerald-800">¡Firma Completada!</h2>
          <p className="text-xs text-gray-500 mt-2">{passenger.full_name} ha firmado la declaración de riesgo para <strong>{activity.name}</strong>.</p>
          <p className="text-[10px] text-gray-400 mt-4 font-mono">ID: {passengerId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8F1F7] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl max-w-lg w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-pine rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-pine">Declaración de Riesgo</h2>
            <p className="text-[10px] text-gray-400">{activity.name} — {departure.departure_date} {departure.departure_time}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-700 leading-relaxed mb-6 border border-gray-100">
          <p className="font-bold mb-2">Por favor lee cuidadosamente:</p>
          <p>Yo, <strong>{passenger.full_name}</strong>, declaro que participo voluntariamente en la actividad de aventura <strong>{activity.name}</strong> organizada por <strong>Rumbo</strong>.</p>
          <p className="mt-2">Entiendo los riesgos inherentes y declaro que:</p>
          <ul className="list-disc ml-4 mt-1 space-y-1">
            <li>Mi estado de salud permite participar.</li>
            <li>Asumo la responsabilidad por mi participación.</li>
            <li>Autorizo atención médica de emergencia si es necesario.</li>
            <li>Libero a la agencia de responsabilidad por riesgos inherentes.</li>
          </ul>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-700 block mb-2">Firma (escribe tu nombre completo):</label>
          <div className="relative">
            <PenTool className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Nombre completo como firma digital"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 pl-10 text-sm font-semibold outline-none focus:border-pine focus:ring-2 focus:ring-pine/20" />
          </div>
        </div>

        <button onClick={handleSign} disabled={isSubmitting}
          className="w-full py-3.5 bg-pine text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#173b2c] disabled:opacity-50 transition-all">
          {isSubmitting ? 'Procesando...' : 'Confirmar y Firmar'}
        </button>

        <p className="text-[10px] text-gray-400 text-center mt-4">
          Este documento tiene validez legal. Fecha: {new Date().toLocaleDateString('es-AR')}
        </p>
      </div>
    </div>
  );
}
