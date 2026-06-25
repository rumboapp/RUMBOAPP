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

  const [rutPassport, setRutPassport] = useState('');
  const [nationality, setNationality] = useState('');
  const [previousExperience, setPreviousExperience] = useState(false);
  const [previousExperienceDetail, setPreviousExperienceDetail] = useState('');
  const [allergies, setAllergies] = useState('');
  const [contraindicatedMeds, setContraindicatedMeds] = useState('');
  const [recentInjuries, setRecentInjuries] = useState('');
  const [pregnancy, setPregnancy] = useState(false);
  const [heartConditions, setHeartConditions] = useState(false);
  const [personalInsurance, setPersonalInsurance] = useState('');

  const loadData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      const p = await db.getPassenger(passengerId);
      if (!p) { setLoadError(true); return; }
      applyPassenger(p);
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
    applyPassenger(data.passenger);
    setDeparture(data.departure);
    setActivity(data.activity);
  };

  const applyPassenger = (p: Passenger) => {
    setPassenger(p);
    setRutPassport(p.rut_passport || '');
    setNationality(p.nationality || '');
    setPreviousExperience(!!p.previous_experience);
    setPreviousExperienceDetail(p.previous_experience_detail || '');
    setAllergies(p.allergies || '');
    setContraindicatedMeds(p.contraindicated_medications || '');
    setRecentInjuries(p.recent_injuries || '');
    setPregnancy(!!p.pregnancy);
    setHeartConditions(!!p.heart_conditions);
    setPersonalInsurance(p.personal_insurance || '');
  };

  useEffect(() => {
    loadData();
  }, [passengerId]);

  const handleSign = async () => {
    if (!rutPassport.trim()) { notifyWarning('Por favor ingresa tu RUT o pasaporte. / Please enter your ID or passport.'); return; }
    if (!nationality.trim()) { notifyWarning('Por favor ingresa tu nacionalidad. / Please enter your nationality.'); return; }
    if (!signature.trim()) { notifyWarning('Por favor ingresa tu nombre completo como firma. / Please enter your full name as a signature.'); return; }
    setIsSubmitting(true);
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('sign_risk_waiver', {
        p_passenger_id: passengerId,
        p_signature: signature,
        p_rut_passport: rutPassport,
        p_nationality: nationality,
        p_previous_experience: previousExperience,
        p_previous_experience_detail: previousExperienceDetail || null,
        p_allergies: allergies || null,
        p_contraindicated_medications: contraindicatedMeds || null,
        p_recent_injuries: recentInjuries || null,
        p_pregnancy: pregnancy,
        p_heart_conditions: heartConditions,
        p_personal_insurance: personalInsurance || null,
      });
      if (error) {
        notifyWarning('No se pudo registrar la firma. Intenta nuevamente.');
        setIsSubmitting(false);
        return;
      }
    } else {
      await db.updatePassenger(passengerId, {
        signed_risk_waiver: true,
        signature_data: signature,
        signed_at: new Date().toISOString(),
        rut_passport: rutPassport,
        nationality: nationality,
        previous_experience: previousExperience,
        previous_experience_detail: previousExperienceDetail || undefined,
        allergies: allergies || undefined,
        contraindicated_medications: contraindicatedMeds || undefined,
        recent_injuries: recentInjuries || undefined,
        pregnancy,
        heart_conditions: heartConditions,
        personal_insurance: personalInsurance || undefined,
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

        {/* 1. Datos del participante */}
        <div className="mb-5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Datos del participante / Participant details</p>
          <div className="grid grid-cols-1 gap-2 bg-gray-50 border border-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-700"><span className="font-semibold">Nombre completo / Full name:</span> {passenger.full_name}</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-semibold text-gray-400 uppercase block mb-0.5">RUT o Pasaporte / ID or Passport *</label>
                <input type="text" value={rutPassport} onChange={(e) => setRutPassport(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" placeholder="12.345.678-9" />
              </div>
              <div>
                <label className="text-[9px] font-semibold text-gray-400 uppercase block mb-0.5">Nacionalidad / Nationality *</label>
                <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" placeholder="Chilena" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Declaración de salud y experiencia */}
        <div className="mb-5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Declaración de salud y experiencia / Health &amp; experience</p>
          <div className="flex flex-col gap-2 bg-gray-50 border border-gray-100 rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={previousExperience} onChange={(e) => setPreviousExperience(e.target.checked)} className="rounded text-pine" />
              <span className="text-xs text-gray-700">Tengo experiencia previa en esta actividad / I have previous experience in this activity</span>
            </label>
            {previousExperience && (
              <input type="text" value={previousExperienceDetail} onChange={(e) => setPreviousExperienceDetail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" placeholder="Cuéntanos brevemente / Tell us briefly" />
            )}
            <div>
              <label className="text-[9px] font-semibold text-gray-400 uppercase block mb-0.5">Alergias / Allergies</label>
              <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" placeholder="Ninguna / None" />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-gray-400 uppercase block mb-0.5">Medicamentos contraindicados / Contraindicated medications</label>
              <input type="text" value={contraindicatedMeds} onChange={(e) => setContraindicatedMeds(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" placeholder="Ninguno / None" />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-gray-400 uppercase block mb-0.5">Operaciones recientes o lesiones / Recent surgeries or injuries</label>
              <input type="text" value={recentInjuries} onChange={(e) => setRecentInjuries(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" placeholder="Ninguna / None" />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={pregnancy} onChange={(e) => setPregnancy(e.target.checked)} className="rounded text-pine" />
                <span className="text-xs text-gray-700">Embarazo / Pregnancy</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={heartConditions} onChange={(e) => setHeartConditions(e.target.checked)} className="rounded text-pine" />
                <span className="text-xs text-gray-700">Problemas cardíacos / Heart conditions</span>
              </label>
            </div>
            <div>
              <label className="text-[9px] font-semibold text-gray-400 uppercase block mb-0.5">Seguro personal / Personal insurance</label>
              <input type="text" value={personalInsurance} onChange={(e) => setPersonalInsurance(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" placeholder="Opcional / Optional" />
            </div>
          </div>
        </div>

        {/* 3. Aceptación de riesgo */}
        <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-700 leading-relaxed mb-6 border border-gray-100">
          <p className="font-bold mb-2">Aceptación de riesgo / Risk acceptance:</p>
          <p>
            Yo, <strong>{passenger.full_name}</strong>, declaro que he sido informado detalladamente sobre los riesgos que implica la actividad <strong>{activity.name}</strong> (caídas, condiciones climáticas cambiantes, fatiga, inmersión en agua, entre otros), organizada por <strong>Rumbo</strong>. Declaro estar en condiciones físicas y psíquicas compatibles con la actividad. Me comprometo a seguir estrictamente las instrucciones del guía y utilizar el equipo de seguridad proporcionado. El prestador no se hace responsable por conductas temerarias o incumplimiento de instrucciones.
          </p>
          <p className="mt-2 text-gray-500">
            I declare that I have been informed in detail about the risks involved in this activity (falls, changing weather conditions, fatigue, water immersion, among others). I declare that I am in physical and mental conditions compatible with the activity. I agree to strictly follow the guide's instructions and use the provided safety equipment. The provider is not responsible for reckless behavior or failure to follow instructions.
          </p>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-700 block mb-2">Firma (escribe tu nombre completo) / Signature (type your full name):</label>
          <div className="relative">
            <PenTool className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Nombre completo como firma digital / Full name as digital signature"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 pl-10 text-sm font-semibold outline-none focus:border-pine focus:ring-2 focus:ring-pine/20" />
          </div>
        </div>

        <button onClick={handleSign} disabled={isSubmitting}
          className="w-full py-3.5 bg-pine text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#173b2c] disabled:opacity-50 transition-all">
          {isSubmitting ? 'Procesando... / Processing...' : 'Confirmar y Firmar / Confirm and Sign'}
        </button>
      </div>
    </div>
  );
}
