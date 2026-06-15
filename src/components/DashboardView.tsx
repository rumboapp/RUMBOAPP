/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { fetchWeather, WeatherInfo } from '../lib/weather';
import { getPassengerReminderLink, getPassengerCancellationLink } from '../lib/whatsapp';
import { exportToCSV, printPDF } from '../lib/export';
import { useAuth } from '../lib/auth-context';
import { Activity, Departure, Passenger, Guide } from '../types';
import { 
  Calendar, Clock, User, Phone, Users, CheckCircle, HelpCircle, AlertOctagon, 
  Trash2, Plus, ArrowRight, Check, X, Eye, FileSpreadsheet, Printer, CloudSun,
  MapPin, ClipboardList, RefreshCw, Send, AlertTriangle, ShieldCheck,
  PenTool, Copy, Compass
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (hash: string) => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const { agency, isAdmin } = useAuth();
  const agencyId = agency?.id || '';

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const datePickerRef = React.useRef<HTMLInputElement>(null);
  
  // Weather
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Modals & Panels State
  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [isAddDepartureOpen, setIsAddDepartureOpen] = useState(false);
  const [isAddPassengerOpen, setIsAddPassengerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // New Departure Form Field state
  const [newActivityId, setNewActivityId] = useState('');
  const [newGuideId, setNewGuideId] = useState('');
  const [newGuideIds, setNewGuideIds] = useState<string[]>([]);
  const [editingGuidesDepId, setEditingGuidesDepId] = useState<string | null>(null);
  const [newDepartureDate, setNewDepartureDate] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newNotes, setNewNotes] = useState('');

  // New Passenger Form Field state
  const [paxName, setPaxName] = useState('');
  const [paxPhone, setPaxPhone] = useState('');
  const [paxCount, setPaxCount] = useState(1);
  const [paxNotes, setPaxNotes] = useState('');
  const [paxAge, setPaxAge] = useState('');
  const [paxHasMinor, setPaxHasMinor] = useState(false);
  const [paxMinorName, setPaxMinorName] = useState('');
  const [paxMinorAge, setPaxMinorAge] = useState('');
  const [paxDietary, setPaxDietary] = useState('');
  const [paxMedical, setPaxMedical] = useState('');
  const [paxEmergencyPhone, setPaxEmergencyPhone] = useState('');
  const [paxCustomPrice, setPaxCustomPrice] = useState('');

  // Bulk Notification Modal
  const [isBulkNotifyOpen, setIsBulkNotifyOpen] = useState(false);

  const loadData = () => {
    if (!agencyId) return;
    const allDeps = db.getDepartures(agencyId);
    
    // Sort departures chronologically by time
    const sortedDeps = allDeps.sort((a,b) => a.departure_time.localeCompare(b.departure_time));
    setDepartures(sortedDeps);
    
    setActivities(db.getActivities(agencyId).filter(a => a.active));
    setGuides(db.getGuides(agencyId).filter(g => g.active));

    // Reload active passengers of selected departure if one is selected
    if (selectedDeparture) {
      setPassengers(db.getPassengersByDeparture(selectedDeparture.id));
    }
  };

  const loadWeatherData = async () => {
    if (!agency) return;
    setLoadingWeather(true);
    try {
      const data = await fetchWeather(agency.latitude, agency.longitude);
      setWeather(data);
    } catch (_) {}
    setLoadingWeather(false);
  };

  useEffect(() => {
    loadData();
    loadWeatherData();

    // Event listener for updates coming from simulation console or other views
    window.addEventListener('rumbo_db_updated', loadData);
    window.addEventListener('rumbo_weather_updated', loadWeatherData);

    return () => {
      window.removeEventListener('rumbo_db_updated', loadData);
      window.removeEventListener('rumbo_weather_updated', loadWeatherData);
    };
  }, [agencyId, agency?.latitude, agency?.longitude, selectedDeparture?.id]);

  // Filter departures for the active date tab
  const filteredDepartures = departures.filter(d => d.departure_date === selectedDate);

  // Create departure call
  const handleCreateDeparture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityId) {
      alert('Por favor selecciona una actividad.');
      return;
    }
    
    const scheduledDate = newDepartureDate || selectedDate;
    db.createDeparture(agencyId, {
      activity_id: newActivityId,
      guide_id: newGuideIds.length > 0 ? newGuideIds[0] : null,
      guide_ids: newGuideIds,
      departure_date: scheduledDate,
      departure_time: newTime,
      status: 'programada',
      notes: newNotes
    });

    setIsAddDepartureOpen(false);
    setSelectedDate(scheduledDate); // Focus switch the schedule to the date of the new departure!
    // Reset fields
    setNewActivityId('');
    setNewGuideId('');
    setNewGuideIds([]);
    setNewDepartureDate('');
    setNewTime('09:00');
    setNewNotes('');

    loadData();
  };

  // Add passenger call
  const handleAddPassenger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeparture) return;
    if (!paxName || !paxPhone) {
      alert('Nombre completo y celular son requeridos.');
      return;
    }

    db.createPassenger({
      departure_id: selectedDeparture.id,
      full_name: paxName,
      phone: paxPhone,
      pax_count: Number(paxCount),
      checked_in: false,
      notes: paxNotes,
      age: paxAge ? Number(paxAge) : undefined,
      has_minor: paxHasMinor,
      minor_name: paxHasMinor && paxMinorName ? paxMinorName : undefined,
      minor_age: paxHasMinor && paxMinorAge ? Number(paxMinorAge) : undefined,
      dietary_restrictions: paxDietary || undefined,
      medical_issues: paxMedical || undefined,
      emergency_phone: paxEmergencyPhone || undefined,
      custom_price: paxCustomPrice ? Number(paxCustomPrice) : undefined,
    });

    setIsAddPassengerOpen(false);
    setPaxName('');
    setPaxPhone('');
    setPaxCount(1);
    setPaxNotes('');
    setPaxAge('');
    setPaxHasMinor(false);
    setPaxMinorName('');
    setPaxMinorAge('');
    setPaxDietary('');
    setPaxMedical('');
    setPaxCustomPrice('');
    setPaxEmergencyPhone('');

    // Reload
    loadData();
  };

  // Change individual passenger Check-in checkbox
  const handleToggleCheckIn = (paxId: string, current: boolean) => {
    db.updatePassenger(paxId, { checked_in: !current });
    loadData();
  };

  // Delete passenger
  const handleDeletePassenger = (paxId: string) => {
    if (confirm('¿Retirar a este pasajero de la lista?')) {
      db.deletePassenger(paxId);
      loadData();
    }
  };

  // Change departure guides
  const handleUpdateDepartureGuides = (depId: string, guideIds: string[]) => {
    db.updateDeparture(depId, { 
      guide_ids: guideIds,
      guide_id: guideIds.length > 0 ? guideIds[0] : null
    });
    loadData();
    if (selectedDeparture?.id === depId) {
      setSelectedDeparture(prev => prev ? { 
        ...prev, 
        guide_ids: guideIds,
        guide_id: guideIds.length > 0 ? guideIds[0] : null 
      } : null);
    }
  };

  // Change departure status
  const handleUpdateStatus = (depId: string, status: 'programada' | 'en_curso' | 'finalizada' | 'cancelada') => {
    db.updateDeparture(depId, { status });
    loadData();
    if (selectedDeparture?.id === depId) {
      setSelectedDeparture(prev => prev ? { ...prev, status } : null);
    }
  };

  // REQUISITO CLAVE 6: Suspensión por clima masiva
  const handleWeatherSuspension = (depId: string) => {
    const dep = departures.find(d => d.id === depId);
    if (!dep) return;
    
    const act = activities.find(a => a.id === dep.activity_id);
    if (!act) return;

    if (confirm(`⚠ SUSPENSIÓN POR CLIMA ADVERSO: ¿Deseas suspender la salida de ${act.name} de las ${dep.departure_time}hs? Se marcará como cancelada y se habilitarán los avisos masivos.`)) {
      // 1. Update status
      db.updateDeparture(depId, { status: 'cancelada' });
      
      // 2. Trigger notification
      db.createNotification(
        agencyId,
        'weather_alert',
        'Salida suspendida por clima',
        `La excursión ${act.name} de hoy ha sido cancelada debido a ráfagas/tormenta.`,
        depId
      );

      // Loading stats
      loadData();
      
      // 3. Select this departure and pop up Bulk Notify Window!
      const currentPax = db.getPassengersByDeparture(depId);
      setPassengers(currentPax);
      setSelectedDeparture(dep);
      setIsBulkNotifyOpen(true);
    }
  };

  const getGuideName = (guideId: string | null) => {
    if (!guideId) return 'Sin guía asignado';
    return guides.find(g => g.id === guideId)?.full_name || 'Guía Registrado';
  };

  const getDepartureGuides = (dep: Departure): string => {
    const ids = dep.guide_ids && dep.guide_ids.length > 0
      ? dep.guide_ids
      : dep.guide_id ? [dep.guide_id] : [];
    
    if (ids.length === 0) return 'Sin guía asignado';
    const names = ids.map(id => guides.find(g => g.id === id)?.full_name).filter(Boolean);
    if (names.length === 0) return 'Sin guía asignado';
    return names.join(', ');
  };

  const renderPassengerCheckingList = (dep: Departure) => {
    const activeAct = activities.find(a => a.id === dep.activity_id)!;
    if (!activeAct) return null;
    const activeGuideName = getDepartureGuides(dep);
    const bookedSum = passengers.reduce((sum, p) => sum + p.pax_count, 0);

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 flex flex-col gap-4 animate-in fade-in duration-200">
        {/* Miniature header */}
        <div className="text-left">
          <h3 className="font-display font-medium text-pine text-md leading-tight">
            {activeAct.name}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Punto encuentro: <span className="font-semibold text-gray-600">{activeAct.meeting_point}</span>
          </p>
        </div>

        {/* Actions Bar (Export, Print, PDF) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-3">
          <span className="text-xs font-bold text-gray-700 uppercase">
            Despacho ({bookedSum}/{activeAct.capacity_max} pax)
          </span>
          
          <div className="flex gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); exportToCSV(passengers, activeAct.name, dep.departure_date, activeGuideName); }}
              className="p-1.5 bg-gray-50 hover:bg-emerald-50 text-emerald-800 rounded-lg border border-gray-200/60 font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
              title="Exportar archivo CSV para Microsoft Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); printPDF(passengers, activeAct.name, dep.departure_date, activeGuideName, activeAct.meeting_point); }}
              className="p-1.5 bg-gray-50 hover:bg-sky text-ocean rounded-lg border border-gray-200/60 font-semibold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
              title="Imprimir listado en papel o guardar en PDF"
            >
              <Printer className="w-3.5 h-3.5" /> Ficha Guía
            </button>
          </div>
        </div>

        {/* Notes box */}
        {dep.notes && (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-xs text-amber-800 text-left">
            <strong>💡 Nota de coordinación:</strong> {dep.notes}
          </div>
        )}

        {/* Passengers Checklist */}
        <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto pr-1">
          {passengers.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-400" />
              <p className="text-xs">No hay pasajeros inscritos en esta salida</p>
            </div>
          ) : (
            passengers.map((p) => {
              const historyInfo = db.getPassengerHistory(p.full_name, p.phone);

              return (
                <div 
                  key={p.id}
                  className={`p-3 rounded-xl border transition-all ${
                    p.checked_in 
                      ? 'bg-emerald-50/40 border-emerald-100/50' 
                      : 'bg-transparent border-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-2">
                      {/* Checkbox input trigger */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleCheckIn(p.id, p.checked_in); }}
                        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors cursor-pointer ${
                          p.checked_in 
                            ? 'bg-emerald-600 border-transparent text-white' 
                            : 'border-gray-300 bg-white hover:border-pine'
                        }`}
                        title="Marcar check-in / presente"
                      >
                        {p.checked_in && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div className="text-left">
                        <div className="flex flex-wrap items-center gap-1">
                          <strong className="text-xs text-gray-850">{p.full_name}</strong>
                          
                          {/* Star counter badge for repeats */}
                          {historyInfo.counts > 1 && (
                            <span 
                              className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full cursor-help"
                              title={`¡Pasajero recurrente! Estuvo en ${historyInfo.counts} excursiones con nosotros.`}
                            >
                              ★ {historyInfo.counts}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-gray-500 font-mono mt-0.5 flex items-center gap-1 text-left">
                          <Phone className="w-3 h-3" /> {p.phone}
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-1 text-left items-center">
                          <span className="text-[8.5px] bg-[#E8F1F7] text-[#0F6BA8] font-bold px-1.5 py-0.5 rounded-md">
                            {p.pax_count} PAX
                          </span>
                          <button
                            onClick={() => {
                              const oldPrice = p.custom_price ?? (p.pax_count * activeAct.price);
                              const val = prompt(`Modificar precio cobrado total por ${p.full_name}:`, String(oldPrice));
                              if (val !== null && !isNaN(Number(val))) {
                                db.updatePassenger(p.id, { custom_price: Number(val) });
                                setPassengers(db.getPassengersByDeparture(selectedDeparture.id));
                              }
                            }}
                            className="text-[8.5px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold font-mono inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Haz clic para modificar el precio cobrado"
                          >
                            <span>💲 {(p.custom_price ?? (p.pax_count * activeAct.price)).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}</span>
                            <span className="text-[7.5px] font-normal underline opacity-80 ml-0.5">Editar</span>
                          </button>
                          {p.age !== undefined && (
                            <span className="text-[8.5px] bg-gray-100 text-gray-750 font-bold px-1.5 py-0.5 rounded-md">
                              Edad: {p.age}
                            </span>
                          )}
                          {p.emergency_phone && (
                            <span className="text-[8.5px] bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-md font-mono" title={`Teléfono de emergencia: ${p.emergency_phone}`}>
                              📞 Emerg: {p.emergency_phone}
                            </span>
                          )}
                          {p.dietary_restrictions && (
                            <span className="text-[8.5px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded-md font-bold" title="Restricción dietaria">
                              🥗 {p.dietary_restrictions}
                            </span>
                          )}
                          {p.medical_issues && (
                            <span className="text-[8.5px] bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded-md font-bold" title="Alerta médica">
                              ⚠️ {p.medical_issues}
                            </span>
                          )}
                          {p.has_minor && (
                            <span className="text-[8.5px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-md font-bold" title={`Copasajero menor de edad: ${p.minor_name} (${p.minor_age} años)`}>
                              👦 Menor: {p.minor_name} ({p.minor_age}a.)
                            </span>
                          )}
                          {p.signed_risk_waiver ? (
                            <span 
                              className="text-[8.5px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5 relative group cursor-help"
                              title="Ficha Firmada Digitalmente"
                            >
                              ✍️ Ficha Firmada
                              {p.signature_data && (
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-gray-200 p-1 rounded-lg shadow-xl hidden group-hover:block z-50">
                                  <img src={p.signature_data} alt="Firma" className="max-h-16 w-32 object-contain bg-white" />
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[8.5px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1" title="Ficha de aceptación de riesgo sin firmar">
                              ⚠️ Ficha Vacante
                            </span>
                          )}
                        </div>
                        {p.notes && (
                          <p className="text-[10px] text-gray-500 italic mt-1.5 block leading-tight text-left">
                            "{p.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* WhatsApp Reminder Send button and delete */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          const wUrl = `${window.location.origin}/#/firma/${p.id}`;
                          navigator.clipboard.writeText(wUrl);
                          alert('¡Enlace de Ficha Digital de Riesgo copiado al portapapeles!');
                        }}
                        className="p-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
                        title="Copiar enlace de Ficha de Riesgo"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {!p.signed_risk_waiver && (
                        <a
                          href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hola *${p.full_name}*, para participar en la excursión de *${activeAct.name}*, solicitamos completar y firmar la Ficha de Riesgo Digital desde tu celular entrando aquí: ${window.location.origin}/#/firma/${p.id}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-lg border border-purple-250 bg-purple-50 hover:bg-purple-100 text-purple-800 flex items-center justify-center transition-colors"
                          title="Enviar Ficha de Riesgo por WhatsApp"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <a
                        href={dep.status === 'cancelada' 
                          ? getPassengerCancellationLink(p, dep, activeAct) 
                          : getPassengerReminderLink(p, dep, activeAct, agency?.whatsapp_template)
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-1 rounded-lg border text-xs font-semibold flex items-center justify-center ${
                          dep.status === 'cancelada'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                        }`}
                        title={dep.status === 'cancelada' 
                          ? 'Aviso de cancelación por clima por WhatsApp' 
                          : 'Enviar recordatorio por WhatsApp'
                        }
                      >
                        <Send className="w-3.5 h-3.5" />
                      </a>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeletePassenger(p.id)}
                          className="p-1 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded animate-none duration-0"
                          title="Desasociar pasajero de excursión"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Passenger triggering button */}
        {dep.status !== 'cancelada' && dep.status !== 'finalizada' && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsAddPassengerOpen(true); }}
            className="mt-2 w-full py-2 border-2 border-dashed border-sky hover:border-pine text-ocean hover:text-pine hover:bg-sky/40 font-semibold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Registrar Pasajero
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-1 sm:px-4">
      {/* 2. Slim, Professional Compact Header Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-gradient-to-r from-pine to-emerald-900 rounded-2xl p-3.5 px-5 text-white shadow-md">
        <div className="flex items-center gap-3 text-left">
          <div className="p-2 bg-white/10 rounded-xl">
            <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
              <MapPin className="w-3 h-3" /> {agency?.city || 'Puerto Varas'}
            </div>
            <h1 className="text-base font-display font-bold leading-none mt-0.5">
              Operaciones Diarias
            </h1>
            <p className="text-[10px] text-emerald-100/75 mt-1">
              Despacho terrestre, marítimo y gestión de guías en tiempo real.
            </p>
          </div>
        </div>

        {/* Dynamic Weather Widget (Open-Meteo) inline */}
        <div className="flex items-center gap-3.5 bg-white/10 rounded-xl p-2 px-4 border border-white/10 shrink-0 min-w-[210px] shadow-3xs">
          {loadingWeather ? (
            <div className="flex items-center gap-2 text-[10px] text-emerald-200 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Clima...
            </div>
          ) : weather ? (
            <div className="flex items-center justify-between w-full gap-4 text-left">
              <div>
                <p className="text-[9px] text-emerald-200 font-extrabold uppercase tracking-widest">Puerto Varas</p>
                <p className="text-[11px] text-white font-semibold mt-0.5 capitalize">{weather.description}</p>
                <p className="text-[9px] text-emerald-100/60 font-mono mt-0.5">
                  V: {weather.wind_speed}km/h | H: {weather.humidity}%
                </p>
              </div>
              <div className="text-right flex flex-col items-center justify-center">
                <span className="text-xl font-display font-bold text-white">
                  {weather.temperature}°C
                </span>
                <span className="text-base leading-none bg-white/15 p-1 rounded mt-0.5">
                  {weather.condition === 'despejado' && '☀️'}
                  {weather.condition === 'nublado' && '☁️'}
                  {weather.condition === 'lluvia' && '🌧️'}
                  {weather.condition === 'tormenta' && '⛈️'}
                  {weather.condition === 'nieve' && '❄️'}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-white/50">Clima offline</span>
          )}
        </div>
      </div>

      {weather?.condition === 'tormenta' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700 font-medium">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-800">⚠️ ALERTA POR TEMPESTAD RECTORA</p>
              <p className="text-xs text-rose-600">Tormentas severas simuladas. Se recomienda suspender excursiones de riesgo.</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Calendar Timeline Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 items-center">
        {[0, 1, 2, 3].map((offset) => {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          const dateStr = d.toISOString().split('T')[0];
          const label = offset === 0 ? 'Hoy' : offset === 1 ? 'Mañana' : d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
          const isSelected = selectedDate === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => {
                setSelectedDate(dateStr);
                setSelectedDeparture(null);
              }}
              className={`px-4 py-2.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isSelected 
                  ? 'bg-pine text-white shadow-pop font-semibold' 
                  : 'bg-white text-gray-600 hover:bg-sky border border-gray-150'
              }`}
            >
              {label} <span className="text-[10px] opacity-70">({d.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })})</span>
            </button>
          );
        })}

        {/* Full Interactive Date Picker Pill */}
        <button 
          onClick={() => setIsDatePickerOpen(true)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-xs whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
            ![0, 1, 2, 3].map(offset => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              return d.toISOString().split('T')[0];
            }).includes(selectedDate)
              ? 'bg-pine text-white border-transparent shadow-pop font-semibold'
              : 'bg-white text-gray-600 hover:bg-sky border-gray-150'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>
            {![0, 1, 2, 3].map(offset => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              return d.toISOString().split('T')[0];
            }).includes(selectedDate) ? `Fecha: ${selectedDate.split('-').reverse().join('/')}` : 'Elegir otro día...'}
          </span>
        </button>
      </div>

      {/* 3. Main Split Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Departure List Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex justify-between items-center bg-transparent px-1">
            <h2 className="font-semibold text-pine flex items-center gap-2 text-md">
              <ClipboardList className="w-4 h-4" /> Salidas Programadas
              <span className="text-xs px-2 py-0.5 bg-sky text-ocean rounded-full font-bold font-mono">
                {filteredDepartures.length}
              </span>
            </h2>

            {isAdmin && (
              <button
                id="btn-add-departure"
                onClick={() => {
                  setNewDepartureDate(selectedDate);
                  setIsAddDepartureOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-pine hover:bg-pine/90 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Programar Salida
              </button>
            )}
          </div>

          {filteredDepartures.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 flex flex-col items-center justify-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No hay salidas programadas para esta fecha</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">Genera nuevas salidas para despachar guías y suscribir inscriptos o turistas en esta jornada.</p>
              {isAdmin && (
                <button
                  onClick={() => {
                    setNewDepartureDate(selectedDate);
                    setIsAddDepartureOpen(true);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-pine hover:bg-pine/90 text-white font-medium rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Programar Salida de Aventura
                </button>
              )}
            </div>
          ) : (
            filteredDepartures.map((dep) => {
              const act = activities.find(a => a.id === dep.activity_id);
              if (!act) return null;

              const isSelected = selectedDeparture?.id === dep.id;
              
              // Count passengers booked inside this departure
              const depPassengers = db.getPassengersByDeparture(dep.id);
              const bookedSum = depPassengers.reduce((sum, p) => sum + p.pax_count, 0);

              return (
                <div
                  key={dep.id}
                  id={`departure-card-${dep.id}`}
                  onClick={() => {
                    setSelectedDeparture(dep);
                    setPassengers(depPassengers);
                  }}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer select-none ${
                    isSelected 
                      ? 'ring-2 ring-pine border-transparent shadow-card' 
                      : 'border-gray-100 hover:border-pine/30 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      {/* Image Thumbnail */}
                      <img
                        src={act.photo_url}
                        alt={act.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                      <div>
                        {/* Status tag */}
                        <div className="flex gap-2 items-center">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            dep.status === 'programada' && 'bg-emerald-50 text-emerald-700'
                          } ${
                            dep.status === 'en_curso' && 'bg-blue-50 text-blue-700'
                          } ${
                            dep.status === 'finalizada' && 'bg-gray-100 text-gray-700'
                          } ${
                            dep.status === 'cancelada' && 'bg-rose-50 text-rose-700'
                          }`}>
                            {dep.status}
                          </span>
                          
                          <span className="text-[10px] text-gray-400 font-semibold font-mono flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-gray-400" /> {dep.departure_time}hs
                          </span>
                        </div>

                        <h3 className="font-semibold text-gray-900 border-none select-none text-sm leading-tight mt-1">
                          {act.name}
                        </h3>

                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" /> {bookedSum}/{act.capacity_max} pasajeros anotados
                        </p>
                      </div>
                    </div>

                    {/* Quick check icon indicator */}
                    <div className="text-right flex flex-col items-end gap-1">
                      <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-1 text-pine' : 'text-gray-300'}`} />
                      
                      {/* Weather Alert Direct Action warning */}
                      {dep.status !== 'cancelada' && weather?.condition === 'tormenta' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWeatherSuspension(dep.id);
                          }}
                          className="flex items-center gap-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 mt-2 cursor-pointer transition-colors"
                          title="Click para suspender esta salida por clima adverso"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" /> Suspender
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Guide Selection Dropdown Footer inside Card */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-gray-50 pt-3 mt-3 gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 relative">
                      <User className="w-3.5 h-3.5 text-ocean" />
                      {isAdmin ? (
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setEditingGuidesDepId(editingGuidesDepId === dep.id ? null : dep.id)}
                            className="font-medium text-gray-700 hover:text-pine hover:bg-sky/50 rounded py-0.5 px-1.5 cursor-pointer bg-transparent border border-dashed border-gray-200 hover:border-pine flex items-center gap-1 transition-all"
                          >
                            <span>Guías: {getDepartureGuides(dep)}</span>
                          </button>

                          {editingGuidesDepId === dep.id && (
                            <div className="absolute left-0 bottom-full mb-2 z-40 bg-white border border-gray-200 rounded-2xl p-3 shadow-xl min-w-[200px] max-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-150">
                              <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-1.5 ">
                                <span className="font-bold text-[9px] uppercase tracking-wider text-gray-400">Asignar Guías</span>
                                <button 
                                  onClick={() => setEditingGuidesDepId(null)}
                                  className="text-gray-400 hover:text-gray-600 font-bold text-xs"
                                >
                                  ×
                                </button>
                              </div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {guides.map(g => {
                                  const currentIds = dep.guide_ids || (dep.guide_id ? [dep.guide_id] : []);
                                  const isChecked = currentIds.includes(g.id);
                                  return (
                                    <label key={g.id} className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs select-none">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          const nextIds = isChecked 
                                            ? currentIds.filter(id => id !== g.id)
                                            : [...currentIds, g.id];
                                          handleUpdateDepartureGuides(dep.id, nextIds);
                                        }}
                                        className="rounded border-gray-300 text-pine focus:ring-pine/30"
                                      />
                                      <span className="text-gray-700 font-medium truncate">{g.full_name}</span>
                                    </label>
                                  );
                                })}
                                {guides.length === 0 && (
                                  <span className="text-[10px] text-gray-400 block py-1">Registra guías activos primero</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingGuidesDepId(null)}
                                className="w-full mt-2 py-1 bg-pine hover:bg-pine/90 text-white font-bold rounded-lg text-[9px] uppercase tracking-wider text-center"
                              >
                                Listo
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-700">Guías: {getDepartureGuides(dep)}</span>
                      )}
                    </div>

                    {/* Quick Status modification pills if Guide */}
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {dep.status === 'programada' && (
                        <button
                          onClick={() => handleUpdateStatus(dep.id, 'en_curso')}
                          className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-[10px] cursor-pointer shadow-sm transition-all active:scale-95"
                        >
                          Comenzar
                        </button>
                      )}
                      {dep.status === 'en_curso' && (
                        <button
                          onClick={() => handleUpdateStatus(dep.id, 'finalizada')}
                          className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-[10px] cursor-pointer shadow-sm transition-all active:scale-95"
                        >
                          Marcar Finalizada
                        </button>
                      )}
                    </div>
                  </div>

                  {/* MOBILE-ONLY INLINE PASSENGER DRAWER */}
                  {isSelected && (
                    <div className="lg:hidden mt-4 pt-4 border-t border-gray-150" onClick={(e) => e.stopPropagation()}>
                      {renderPassengerCheckingList(dep)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Passenger Checklist Detail Column (5 cols) - DESKTOP ONLY */}
        <div className="hidden lg:block lg:col-span-5">
          {!selectedDeparture ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">Selecciona una excursión</p>
              <p className="text-xs text-gray-451 mt-1">Haz clic en cualquier salida de la lista para ver el despacho de pasajeros, novedades de equipamiento y listados de check-in.</p>
            </div>
          ) : (
            renderPassengerCheckingList(selectedDeparture)
          )}
        </div>
      </div>

      {/* MODAL: Programar Salida */}
      {isAddDepartureOpen && (
        <div id="modal-container" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          {/* Backdrop Dismiss */}
          <div className="absolute inset-0" onClick={() => setIsAddDepartureOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-gray-150 animate-in zoom-in-95 duration-150 z-10 text-left">
            <h3 className="font-display font-medium text-lg text-pine border-none pb-2 mb-4 border-b border-gray-100">
              Programar Nueva Salida
            </h3>

            <form onSubmit={handleCreateDeparture} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Actividad de aventura:
                </label>
                <select
                  required
                  value={newActivityId}
                  onChange={(e) => setNewActivityId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine cursor-pointer"
                >
                  <option value="">Selecciona actividad...</option>
                  {activities.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.duration_minutes} min)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Fecha salida:
                  </label>
                  <input
                    type="date"
                    required
                    value={newDepartureDate}
                    onChange={(e) => setNewDepartureDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine cursor-pointer"
                  />
                  <span className="text-[9px] text-gray-400 mt-1 block">Puedes elegir cualquier fecha futura</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Horario de encuentro:
                  </label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-700 outline-none focus:ring-2 focus:ring-pine/30 focus:border-pine"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Asignar Guías (Múltiples):
                </label>
                <div className="border border-gray-200 rounded-xl p-2 bg-white max-h-32 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {guides.length === 0 ? (
                    <span className="text-[11px] text-gray-400 block p-1">No hay guías activos registrados en tu plantilla.</span>
                  ) : (
                    guides.map(g => {
                      const isChecked = newGuideIds.includes(g.id);
                      return (
                        <label key={g.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer text-xs select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setNewGuideIds(newGuideIds.filter(id => id !== g.id));
                              } else {
                                setNewGuideIds([...newGuideIds, g.id]);
                              }
                            }}
                            className="rounded border-gray-300 text-pine focus:ring-pine/30"
                          />
                          <span className="text-gray-700 font-medium">{g.full_name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <span className="text-[9px] text-gray-400 mt-1 block">Selecciona múltiples guías coordinadores para esta salida turística</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Notas / Observaciones de ruta:
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ej: Salida con adolescentes, llevar neoprenes extra chica, viandas especiales..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none h-20 resize-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-50 pt-3.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDepartureOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-150 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pine text-white hover:bg-pine-hover text-xs font-semibold rounded-xl cursor-pointer shadow-sm transition-all"
                >
                  Crear Salida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Pasajero */}
      {isAddPassengerOpen && selectedDeparture && (
        <div id="modal-container-pax" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          {/* Backdrop Dismiss */}
          <div className="absolute inset-0" onClick={() => setIsAddPassengerOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-gray-150 animate-in zoom-in-95 duration-150 z-10 text-left">
            <h3 className="font-display font-medium text-lg text-pine border-none pb-2 mb-4 border-b border-gray-100">
              Registrar Pasajero / Grupo
            </h3>

            <form onSubmit={handleAddPassenger} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Nombre completo del Titular: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Gustavo Cerati"
                  value={paxName}
                  onChange={(e) => setPaxName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    WhatsApp (con cod. de área): <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej: +56912345678"
                    value={paxPhone}
                    onChange={(e) => setPaxPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                  <span className="text-[8px] text-gray-400 mt-0.5 block">Para reminder de wa.me</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Cant. Pax:
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={20}
                    value={paxCount}
                    onChange={(e) => setPaxCount(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Edad del Titular (Opcional):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    placeholder="Ej: 34"
                    value={paxAge}
                    onChange={(e) => setPaxAge(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Teléfono Emergencia (Opcional):
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej: +56987654321"
                    value={paxEmergencyPhone}
                    onChange={(e) => setPaxEmergencyPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 flex justify-between items-center mb-1 select-none">
                  <span>Precio Cobrado Total (Opcional):</span>
                  {selectedDeparture && (
                    <span className="text-[10px] text-gray-400 font-normal">
                      Sugerido: {(paxCount * (activities.find(a => a.id === selectedDeparture.activity_id)?.price || 0)).toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-xs font-semibold text-gray-400 font-mono">CLP $</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Dejar vacío para usar valor por defecto"
                    value={paxCustomPrice}
                    onChange={(e) => setPaxCustomPrice(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 pl-12 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Restricciones Alimenticias (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Celíaco, Vegano, Ninguna"
                    value={paxDietary}
                    onChange={(e) => setPaxDietary(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Detalle Médico / Alerta (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Asma, Alergia Penicilina"
                    value={paxMedical}
                    onChange={(e) => setPaxMedical(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>
              </div>

              {/* Menor de edad checkbox trigger */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paxHasMinor}
                    onChange={(e) => setPaxHasMinor(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-pine focus:ring-pine"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-705 block leading-tight">Inscribe a un menor de edad</span>
                    <span className="text-[10px] text-gray-400 block font-normal leading-none mt-0.5">Se cargará a estadísticas infantiles</span>
                  </div>
                </label>

                {paxHasMinor && (
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-200 animate-in slide-in-from-top-1 duration-150">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-gray-550 block mb-1">
                        Nombre del Menor:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Sofía Cerati"
                        value={paxMinorName}
                        onChange={(e) => setPaxMinorName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-gray-850 outline-none focus:ring-2 focus:ring-pine/30"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-550 block mb-1">
                        Edad Menor:
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={17}
                        placeholder="Ej: 8"
                        value={paxMinorAge}
                        onChange={(e) => setPaxMinorAge(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono bg-white text-gray-850 outline-none focus:ring-2 focus:ring-pine/30"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-751 block mb-1">
                  Notas sobre equipamiento (Opcional):
                </label>
                <textarea
                  value={paxNotes}
                  onChange={(e) => setPaxNotes(e.target.value)}
                  placeholder="Ej: Talle calzado 41, bastones etc."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none h-14 resize-none focus:ring-2 focus:ring-pine/30"
                />
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-50 pt-3.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPassengerOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-150 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pine text-white hover:bg-pine-hover text-xs font-semibold rounded-xl cursor-pointer shadow-sm"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCREEN/MODAL: Bulk Rescheduling / Weather Cancellation Dispatch Center */}
      {isBulkNotifyOpen && selectedDeparture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setIsBulkNotifyOpen(false)} />
          
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 text-left animate-in zoom-in-95 duration-150 z-10">
            <div className="flex items-start gap-3 border-b border-gray-100 pb-3 mb-4">
              <div className="p-2 bg-rose-50 text-rose-700 rounded-2xl">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-medium text-lg text-rose-800">
                  Despachador de Alertas Climatológicas
                </h3>
                <p className="text-xs text-gray-500">
                  La salida está marcada como canelada. Despacha avisos directos de WhatsApp a tus pasajeros uno por uno usando plantillas pre-armadas en LatAm.
                </p>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto pr-1 flex flex-col gap-2.5 mb-4">
              {passengers.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-6">No había pasajeros registrados.</p>
              ) : (
                passengers.map(p => {
                  const act = activities.find(a => a.id === selectedDeparture.activity_id)!;
                  const link = getPassengerCancellationLink(p, selectedDeparture, act);

                  return (
                    <div key={p.id} className="flex justify-between items-center p-3.5 bg-rose-50/20 border border-rose-100/40 rounded-2xl">
                      <div className="text-left">
                        <p className="text-xs font-bold text-gray-800">{p.full_name} ({p.pax_count} pax)</p>
                        <p className="text-[10px] text-gray-551 font-mono">{p.phone}</p>
                      </div>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-650 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-all active:scale-95 text-center"
                      >
                        <Send className="w-3.5 h-3.5" /> Mandar Alerta wa.me
                      </a>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-50">
              <button
                onClick={() => setIsBulkNotifyOpen(false)}
                className="px-5 py-2.5 bg-gray-150 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cerrar Despachador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Elegir Otro Día (Date Picker) */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          {/* Backdrop Dismiss */}
          <div className="absolute inset-0 select-none" onClick={() => setIsDatePickerOpen(false)} />
          
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border border-gray-150 animate-in zoom-in-95 duration-150 z-10 text-left">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h3 className="font-display font-semibold text-pine text-md flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pine" /> Seleccionar Fecha
              </h3>
              <button 
                onClick={() => setIsDatePickerOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">
              Escribe o selecciona la fecha de operaciones que deseas visualizar en Rumbo:
            </p>

            {/* Nice Input Row */}
            <div className="mb-5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Ingresar Fecha:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                    setSelectedDeparture(null);
                  }
                }}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30 font-medium"
              />
            </div>

            {/* Quick Grid of Next Days */}
            <div className="mb-5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Acceso Rápido Próximos Días</label>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  const dStr = d.toISOString().split('T')[0];
                  const isCur = selectedDate === dStr;
                  const dayName = d.toLocaleDateString('es-AR', { weekday: 'short' });
                  const dayNum = d.getDate();
                  const monthName = d.toLocaleDateString('es-AR', { month: 'short' });
                  return (
                    <button
                      key={dStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dStr);
                        setSelectedDeparture(null);
                        setIsDatePickerOpen(false);
                      }}
                      className={`py-2 px-1 rounded-xl text-center border text-[10px] transition-all cursor-pointer font-medium ${
                        isCur 
                          ? 'bg-pine text-white border-transparent shadow-sm font-semibold'
                          : 'bg-gray-50 text-gray-700 hover:bg-sky border-gray-150'
                      }`}
                    >
                      <span className="block capitalize font-bold leading-none text-[9.5px]">{dayName}</span>
                      <span className="block text-xs font-black mt-1 leading-none">{dayNum}</span>
                      <span className="block text-[8px] opacity-75 uppercase leading-none mt-0.5">{monthName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  setSelectedDate(todayStr);
                  setSelectedDeparture(null);
                  setIsDatePickerOpen(false);
                }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(false)}
                className="flex-1 py-2.5 bg-pine hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-950/10 text-center cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
