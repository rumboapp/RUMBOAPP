/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { fetchWeather, WeatherInfo } from '../lib/weather';
import { getPassengerReminderLink, getPassengerCancellationLink, getRiskWaiverSignLink } from '../lib/whatsapp';
import { exportToCSV, printPDF } from '../lib/export';
import { useAuth } from '../lib/auth-context';
import { useNotification } from '../lib/notification-context';
import { Activity, Departure, Passenger, Guide } from '../types';
import { 
  Calendar, Clock, User, Phone, Users, Check, X, Eye, FileSpreadsheet, Printer, CloudSun,
  MapPin, ClipboardList, Plus, ArrowRight, Send, AlertTriangle, ShieldCheck,
  PenTool, Copy, Compass, Pencil, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronUp, Share2
} from 'lucide-react';
import BookingRequestsPanel from './BookingRequestsPanel';

interface DashboardViewProps {
  onNavigate: (hash: string) => void;
}

export default function DashboardView({ onNavigate }: DashboardViewProps) {
  const { agency, isAdmin } = useAuth();
  const { notifyWarning, notifySuccess, notifyError, confirmAction } = useNotification();
  const agencyId = agency?.id || '';

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'list' | 'week' | 'month'>('list');

  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [isAddDepartureOpen, setIsAddDepartureOpen] = useState(false);
  const [isAddPassengerOpen, setIsAddPassengerOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isBulkNotifyOpen, setIsBulkNotifyOpen] = useState(false);

  // New Departure Form
  const [newActivityId, setNewActivityId] = useState('');
  const [newGuideIds, setNewGuideIds] = useState<string[]>([]);
  const [editingDepartureId, setEditingDepartureId] = useState<string | null>(null);
  const [newDepartureDate, setNewDepartureDate] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newNotes, setNewNotes] = useState('');

  // New Passenger Form
  const [editingPassengerId, setEditingPassengerId] = useState<string | null>(null);
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
  const [paxIsGroupBooking, setPaxIsGroupBooking] = useState(false);
  const [paxCompanyName, setPaxCompanyName] = useState('');
  const [paxGroupMembersText, setPaxGroupMembersText] = useState('');
  const [paxRutPassport, setPaxRutPassport] = useState('');
  const [paxNationality, setPaxNationality] = useState('');
  const [paxEmergencyContactName, setPaxEmergencyContactName] = useState('');
  const [paxPreviousExperience, setPaxPreviousExperience] = useState(false);
  const [paxPreviousExperienceDetail, setPaxPreviousExperienceDetail] = useState('');
  const [paxAllergies, setPaxAllergies] = useState('');
  const [paxContraindicatedMeds, setPaxContraindicatedMeds] = useState('');
  const [paxRecentInjuries, setPaxRecentInjuries] = useState('');
  const [paxPregnancy, setPaxPregnancy] = useState(false);
  const [paxHeartConditions, setPaxHeartConditions] = useState(false);
  const [paxPersonalInsurance, setPaxPersonalInsurance] = useState('');
  const [isWaiverSectionOpen, setIsWaiverSectionOpen] = useState(false);

  const loadData = async () => {
    if (!agencyId) return;
    const allDeps = await db.getDepartures(agencyId);
    const sortedDeps = allDeps.sort((a,b) => a.departure_time.localeCompare(b.departure_time));
    setDepartures(sortedDeps);
    setActivities((await db.getActivities(agencyId)).filter(a => a.active));
    setGuides((await db.getGuides(agencyId)).filter(g => g.active));

    if (selectedDeparture) {
      setPassengers(await db.getPassengersByDeparture(selectedDeparture.id));
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
    window.addEventListener('rumbo_db_updated', loadData);
    window.addEventListener('rumbo_weather_updated', loadWeatherData);
    return () => {
      window.removeEventListener('rumbo_db_updated', loadData);
      window.removeEventListener('rumbo_weather_updated', loadWeatherData);
    };
  }, [agencyId, agency?.latitude, agency?.longitude, selectedDeparture?.id]);

  const filteredDepartures = departures.filter(d => d.departure_date === selectedDate);

  const weekDays = (() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(monday);
      dd.setDate(monday.getDate() + i);
      return dd.toISOString().split('T')[0];
    });
  })();

  const monthDays = (() => {
    const d = new Date(selectedDate);
    const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const lastOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const startOffset = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - startOffset);
    const totalCells = Math.ceil((startOffset + lastOfMonth.getDate()) / 7) * 7;
    return Array.from({ length: totalCells }, (_, i) => {
      const dd = new Date(gridStart);
      dd.setDate(gridStart.getDate() + i);
      return { dateStr: dd.toISOString().split('T')[0], inMonth: dd.getMonth() === d.getMonth(), day: dd.getDate() };
    });
  })();

  const openAddDepartureForDate = (dateStr: string) => {
    resetDepartureForm();
    setSelectedDate(dateStr);
    setNewDepartureDate(dateStr);
    setIsAddDepartureOpen(true);
    setViewMode('list');
  };

  const resetDepartureForm = () => {
    setNewActivityId(''); setNewGuideIds([]); setNewDepartureDate(''); setNewTime('09:00'); setNewNotes('');
    setEditingDepartureId(null);
  };

  const goToAdjacentPeriod = (direction: 1 | -1) => {
    const d = new Date(selectedDate);
    if (viewMode === 'week') d.setDate(d.getDate() + direction * 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + direction);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const periodLabel = (() => {
    if (viewMode === 'week') {
      const start = new Date(weekDays[0]);
      const end = new Date(weekDays[6]);
      const sameMonth = start.getMonth() === end.getMonth();
      const startStr = start.toLocaleDateString('es-AR', { day: 'numeric', month: sameMonth ? undefined : 'short' });
      const endStr = end.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    if (viewMode === 'month') {
      const d = new Date(selectedDate);
      const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    return '';
  })();

  const handleOpenEditDeparture = (dep: Departure) => {
    setEditingDepartureId(dep.id);
    setNewActivityId(dep.activity_id);
    setNewGuideIds(dep.guide_ids && dep.guide_ids.length > 0 ? dep.guide_ids : dep.guide_id ? [dep.guide_id] : []);
    setNewDepartureDate(dep.departure_date);
    setNewTime(dep.departure_time);
    setNewNotes(dep.notes || '');
    setIsAddDepartureOpen(true);
  };

  const handleDeleteDeparture = async (dep: Departure, activityName: string) => {
    const confirmed = await confirmAction({
      title: 'Eliminar salida',
      message: `¿Quieres eliminar la salida de "${activityName}" del ${dep.departure_date}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (confirmed) {
      if (selectedDeparture?.id === dep.id) setSelectedDeparture(null);
      await db.deleteDeparture(dep.id);
      await loadData();
    }
  };

  const WEEKLY_DEPARTURE_LIMITS: Record<string, number> = { free: 5, premium: Infinity, pro: Infinity };

  const getWeekRange = (dateStr: string): [string, string] => {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const toStr = (dt: Date) => dt.toISOString().split('T')[0];
    return [toStr(monday), toStr(sunday)];
  };

  const handleSubmitDeparture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityId) { notifyWarning('Selecciona una actividad.'); return; }
    const scheduledDate = newDepartureDate || selectedDate;

    if (!editingDepartureId) {
      const plan = agency?.subscription_plan || 'free';
      const limit = WEEKLY_DEPARTURE_LIMITS[plan] ?? WEEKLY_DEPARTURE_LIMITS.free;
      if (Number.isFinite(limit)) {
        const [weekStart, weekEnd] = getWeekRange(scheduledDate);
        const departuresThisWeek = departures.filter(
          dep => dep.departure_date >= weekStart && dep.departure_date <= weekEnd
        ).length;
        if (departuresThisWeek >= limit) {
          notifyWarning(`Tu plan Free permite agendar hasta ${limit} salidas por semana. Sube de plan para agendar más.`);
          window.dispatchEvent(new Event('rumbo_open_pricing'));
          return;
        }
      }
    }

    if (editingDepartureId) {
      await db.updateDeparture(editingDepartureId, {
        activity_id: newActivityId,
        guide_id: newGuideIds.length > 0 ? newGuideIds[0] : null,
        guide_ids: newGuideIds,
        departure_date: scheduledDate,
        departure_time: newTime,
        notes: newNotes
      });
    } else {
      await db.createDeparture(agencyId, {
        activity_id: newActivityId,
        guide_id: newGuideIds.length > 0 ? newGuideIds[0] : null,
        guide_ids: newGuideIds,
        departure_date: scheduledDate,
        departure_time: newTime,
        status: 'programada',
        notes: newNotes
      });
    }
    setIsAddDepartureOpen(false);
    setSelectedDate(scheduledDate);
    resetDepartureForm();
    await loadData();
  };

  const resetPassengerForm = () => {
    setEditingPassengerId(null);
    setPaxName(''); setPaxPhone(''); setPaxCount(1); setPaxNotes(''); setPaxAge('');
    setPaxHasMinor(false); setPaxMinorName(''); setPaxMinorAge(''); setPaxDietary('');
    setPaxMedical(''); setPaxCustomPrice(''); setPaxEmergencyPhone('');
    setPaxIsGroupBooking(false); setPaxCompanyName(''); setPaxGroupMembersText('');
    setPaxRutPassport(''); setPaxNationality(''); setPaxEmergencyContactName('');
    setPaxPreviousExperience(false); setPaxPreviousExperienceDetail('');
    setPaxAllergies(''); setPaxContraindicatedMeds(''); setPaxRecentInjuries('');
    setPaxPregnancy(false); setPaxHeartConditions(false); setPaxPersonalInsurance('');
    setIsWaiverSectionOpen(false);
  };

  const handleOpenEditPassenger = (p: Passenger) => {
    setEditingPassengerId(p.id);
    setPaxName(p.full_name);
    setPaxPhone(p.phone);
    setPaxCount(p.pax_count);
    setPaxNotes(p.notes || '');
    setPaxAge(p.age !== undefined ? String(p.age) : '');
    setPaxHasMinor(!!p.has_minor);
    setPaxMinorName(p.minor_name || '');
    setPaxMinorAge(p.minor_age !== undefined ? String(p.minor_age) : '');
    setPaxDietary(p.dietary_restrictions || '');
    setPaxMedical(p.medical_issues || '');
    setPaxEmergencyPhone(p.emergency_phone || '');
    setPaxCustomPrice(p.custom_price !== undefined ? String(p.custom_price) : '');
    setPaxIsGroupBooking(!!p.is_group_booking);
    setPaxCompanyName(p.company_name || '');
    setPaxGroupMembersText(p.group_members_text || '');
    setPaxRutPassport(p.rut_passport || '');
    setPaxNationality(p.nationality || '');
    setPaxEmergencyContactName(p.emergency_contact_name || '');
    setPaxPreviousExperience(!!p.previous_experience);
    setPaxPreviousExperienceDetail(p.previous_experience_detail || '');
    setPaxAllergies(p.allergies || '');
    setPaxContraindicatedMeds(p.contraindicated_medications || '');
    setPaxRecentInjuries(p.recent_injuries || '');
    setPaxPregnancy(!!p.pregnancy);
    setPaxHeartConditions(!!p.heart_conditions);
    setPaxPersonalInsurance(p.personal_insurance || '');
    setIsAddPassengerOpen(true);
  };

  const handleAddPassenger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeparture) return;
    if (!paxName || !paxPhone) { notifyWarning('Nombre y celular son requeridos.'); return; }
    const passengerData = {
      full_name: paxName,
      phone: paxPhone,
      pax_count: Number(paxCount),
      notes: paxNotes,
      age: paxAge ? Number(paxAge) : undefined,
      has_minor: paxHasMinor,
      minor_name: paxHasMinor && paxMinorName ? paxMinorName : undefined,
      minor_age: paxHasMinor && paxMinorAge ? Number(paxMinorAge) : undefined,
      dietary_restrictions: paxDietary || undefined,
      medical_issues: paxMedical || undefined,
      emergency_phone: paxEmergencyPhone || undefined,
      custom_price: paxCustomPrice ? Number(paxCustomPrice) : undefined,
      is_group_booking: paxIsGroupBooking,
      company_name: paxIsGroupBooking && paxCompanyName ? paxCompanyName : undefined,
      group_members_text: paxIsGroupBooking && paxGroupMembersText ? paxGroupMembersText : undefined,
      rut_passport: paxRutPassport || undefined,
      nationality: paxNationality || undefined,
      emergency_contact_name: paxEmergencyContactName || undefined,
      previous_experience: paxPreviousExperience,
      previous_experience_detail: paxPreviousExperience && paxPreviousExperienceDetail ? paxPreviousExperienceDetail : undefined,
      allergies: paxAllergies || undefined,
      contraindicated_medications: paxContraindicatedMeds || undefined,
      recent_injuries: paxRecentInjuries || undefined,
      pregnancy: paxPregnancy,
      heart_conditions: paxHeartConditions,
      personal_insurance: paxPersonalInsurance || undefined,
    };
    if (editingPassengerId) {
      await db.updatePassenger(editingPassengerId, passengerData);
    } else {
      await db.createPassenger({
        departure_id: selectedDeparture.id,
        checked_in: false,
        ...passengerData,
      });
    }
    setIsAddPassengerOpen(false);
    resetPassengerForm();
    await loadData();
  };

  const handleToggleCheckIn = async (paxId: string, current: boolean) => {
    await db.updatePassenger(paxId, { checked_in: !current });
    await loadData();
  };

  const handleTogglePayment = async (p: Passenger) => {
    const next = p.payment_status === 'pagado' ? 'pendiente' : 'pagado';
    await db.updatePassenger(p.id, { payment_status: next });
    await loadData();
  };

  const handleDeletePassenger = async (paxId: string) => {
    const confirmed = await confirmAction({
      message: '¿Quieres retirar a este pasajero de la salida?',
      confirmLabel: 'Retirar',
      destructive: true,
    });
    if (confirmed) {
      await db.deletePassenger(paxId);
      await loadData();
    }
  };

  const handleUpdateDepartureGuides = async (depId: string, guideIds: string[]) => {
    await db.updateDeparture(depId, { guide_ids: guideIds, guide_id: guideIds.length > 0 ? guideIds[0] : null });
    await loadData();
    if (selectedDeparture?.id === depId) {
      setSelectedDeparture(prev => prev ? { ...prev, guide_ids: guideIds, guide_id: guideIds.length > 0 ? guideIds[0] : null } : null);
    }
  };

  const handleUpdateStatus = async (depId: string, status: 'programada' | 'en_curso' | 'finalizada' | 'cancelada') => {
    await db.updateDeparture(depId, { status });
    await loadData();
    if (selectedDeparture?.id === depId) {
      setSelectedDeparture(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleWeatherSuspension = async (depId: string) => {
    const dep = departures.find(d => d.id === depId);
    if (!dep) return;
    const act = activities.find(a => a.id === dep.activity_id);
    if (!act) return;
    const confirmed = await confirmAction({
      title: 'Suspender salida por clima',
      message: `¿Quieres suspender ${act.name} de las ${dep.departure_time}hs?`,
      confirmLabel: 'Suspender',
      destructive: true,
    });
    if (confirmed) {
      await db.updateDeparture(depId, { status: 'cancelada' });
      await db.createNotification(agencyId, 'weather_alert', 'Salida suspendida', `${act.name} cancelada por clima.`, depId);
      await loadData();
      const currentPax = await db.getPassengersByDeparture(depId);
      setPassengers(currentPax);
      setSelectedDeparture(dep);
      setIsBulkNotifyOpen(true);
    }
  };

  const getGuideName = (guideId: string | null) => {
    if (!guideId) return 'Sin guía';
    return guides.find(g => g.id === guideId)?.full_name || 'Guía';
  };

  const getDepartureGuideNames = (dep: Departure): string[] => {
    const ids = dep.guide_ids && dep.guide_ids.length > 0 ? dep.guide_ids : dep.guide_id ? [dep.guide_id] : [];
    return ids.map(id => guides.find(g => g.id === id)?.full_name).filter((n): n is string => Boolean(n));
  };

  const getDepartureGuides = (dep: Departure): string => {
    const names = getDepartureGuideNames(dep);
    return names.length > 0 ? names.join(', ') : 'Sin guía';
  };

  const renderPassengerList = (dep: Departure) => {
    const activeAct = activities.find(a => a.id === dep.activity_id);
    if (!activeAct) return null;
    const activeGuideName = getDepartureGuides(dep);
    const bookedSum = passengers.reduce((sum, p) => sum + p.pax_count, 0);

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 flex flex-col gap-4">
        <div>
          <h3 className="font-display font-medium text-pine text-md">{activeAct.name}</h3>
          <p className="text-xs text-gray-400">Punto: <strong className="text-gray-600">{activeAct.meeting_point}</strong></p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-50 pb-3">
          <span className="text-xs font-bold uppercase">Despacho ({bookedSum}/{activeAct.capacity_max} pax)</span>
          <div className="flex gap-1.5">
            {isAdmin && dep.public_token && dep.status === 'programada' && (
              <button onClick={(e) => {
                  e.stopPropagation();
                  const url = `${window.location.origin}/#/reservar/${dep.public_token}`;
                  navigator.clipboard.writeText(url).then(
                    () => notifySuccess('Link de reserva copiado. Compártelo por WhatsApp o redes sociales.'),
                    () => notifyError('No se pudo copiar el link.')
                  );
                }}
                title="Copiar link público de reserva para invitar pasajeros"
                className="p-1.5 bg-gray-50 text-pine rounded-lg border text-[10px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-pine/10 transition-colors">
                <Share2 className="w-3.5 h-3.5" /> Invitar
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); exportToCSV(passengers, activeAct.name, dep.departure_date, activeGuideName); }}
              className="p-1.5 bg-gray-50 text-emerald-800 rounded-lg border text-[10px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-emerald-50 transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={(e) => { e.stopPropagation(); printPDF(passengers, activeAct.name, dep.departure_date, activeGuideName, activeAct.meeting_point, () => notifyError('Habilita las ventanas emergentes (pop-ups) para ver el PDF imprimible.')); }}
              className="p-1.5 bg-gray-50 text-ocean rounded-lg border text-[10px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-ocean/10 transition-colors">
              <Printer className="w-3.5 h-3.5" /> Ficha
            </button>
          </div>
        </div>

        {dep.notes && (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-xs text-amber-800">
            <strong>💡 Nota:</strong> {dep.notes}
          </div>
        )}

        <div className="flex flex-col gap-2.5 max-h-[400px] overflow-y-auto">
          {passengers.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No hay pasajeros inscritos</p>
            </div>
          ) : (
            passengers.map((p) => (
              <div key={p.id} className={`p-3 rounded-xl border transition-all ${p.checked_in ? 'bg-emerald-50/40 border-emerald-100' : 'bg-transparent border-gray-100'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleToggleCheckIn(p.id, p.checked_in); }}
                      title={p.checked_in ? 'Check-in realizado: el pasajero llegó al punto de encuentro' : 'Marcar check-in: confirma que el pasajero llegó al punto de encuentro'}
                      aria-label="Marcar asistencia (check-in)"
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 cursor-pointer hover:scale-110 transition-transform ${p.checked_in ? 'bg-emerald-600 text-white' : 'border-gray-300 bg-white'}`}>
                      {p.checked_in && <Check className="w-3 h-3" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-1">
                        <strong className="text-xs text-gray-850">{p.full_name}</strong>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{p.phone}</p>
                      {p.is_group_booking && (
                        <p className="text-[10px] text-ocean mt-0.5">
                          🏢 {p.company_name ? p.company_name : 'Reserva grupal'}
                          {p.group_members_text && <span className="text-gray-400"> · {p.group_members_text.split('\n').filter(Boolean).length} integrantes listados</span>}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-[8.5px] bg-[#E8F1F7] text-[#0F6BA8] font-bold px-1.5 py-0.5 rounded">{p.pax_count} PAX</span>
                        {p.is_group_booking && <span className="text-[8.5px] bg-ocean/10 text-ocean border px-1.5 py-0.5 rounded font-bold">🏢 Grupal</span>}
                        {p.checked_in && <span className="text-[8.5px] bg-emerald-100 text-emerald-800 border px-1.5 py-0.5 rounded font-bold">✓ Check-in</span>}
                        {p.age !== undefined && <span className="text-[8.5px] bg-gray-100 text-gray-750 font-bold px-1.5 py-0.5 rounded">Edad: {p.age}</span>}
                        {p.has_minor && <span className="text-[8.5px] bg-indigo-50 text-indigo-700 border px-1.5 py-0.5 rounded">👦 Menor</span>}
                        {p.signed_risk_waiver ? (
                          <span className="text-[8.5px] bg-emerald-100 text-emerald-800 border px-1.5 py-0.5 rounded font-bold">✍️ Firmada</span>
                        ) : (
                          <span className="text-[8.5px] bg-amber-50 text-amber-800 border px-1.5 py-0.5 rounded font-bold">⚠️ Sin firmar</span>
                        )}
                        {p.payment_status && (
                          <button onClick={(e) => { e.stopPropagation(); if (isAdmin) handleTogglePayment(p); }}
                            disabled={!isAdmin}
                            title={isAdmin ? 'Clic para cambiar el estado de pago' : undefined}
                            className={`text-[8.5px] border px-1.5 py-0.5 rounded font-bold transition-colors ${isAdmin ? 'cursor-pointer hover:scale-105' : ''} ${p.payment_status === 'pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
                            {p.payment_status === 'pagado' ? '💰 Pagado' : '💰 Pago pendiente'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAdmin && (
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEditPassenger(p); }}
                        title="Editar datos del pasajero"
                        className="p-1 rounded border bg-white hover:bg-gray-100 text-gray-600 cursor-pointer transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/#/firma/${p.id}`); notifySuccess('Enlace copiado al portapapeles'); }}
                      className="p-1 rounded border bg-white hover:bg-gray-100 text-gray-600 cursor-pointer transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {!p.signed_risk_waiver && (
                      <a href={getRiskWaiverSignLink(p, `${window.location.origin}/#/firma/${p.id}`)}
                        target="_blank" rel="noopener noreferrer"
                        title="Pedir firma de ficha de riesgo por WhatsApp"
                        className="p-1 rounded border bg-white hover:bg-gray-100 text-gray-600 cursor-pointer transition-colors">
                        <PenTool className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <a href={dep.status === 'cancelada' ? getPassengerCancellationLink(p, dep, activeAct) : getPassengerReminderLink(p, dep, activeAct, (agency?.subscription_plan || 'free') !== 'free' ? (activeAct.whatsapp_template || agency?.whatsapp_template) : undefined)}
                      target="_blank" rel="noopener noreferrer" className="p-1 rounded border text-xs font-semibold flex items-center justify-center bg-emerald-50 text-emerald-800">
                      <Send className="w-3.5 h-3.5" />
                    </a>
                    {isAdmin && (
                      <button onClick={() => handleDeletePassenger(p.id)} className="p-1 text-gray-400 hover:text-red-650 cursor-pointer transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {dep.status !== 'cancelada' && dep.status !== 'finalizada' && (
          <button onClick={(e) => { e.stopPropagation(); resetPassengerForm(); setIsAddPassengerOpen(true); }}
            className="mt-2 w-full py-2 border-2 border-dashed border-sky hover:border-pine text-ocean hover:text-pine font-semibold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors">
            <Plus className="w-4 h-4" /> Registrar Pasajero
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-1 sm:px-4">
      <BookingRequestsPanel />
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 blob bg-pine flex items-center justify-center shrink-0"><Compass className="w-5 h-5 text-white" /></div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-451 font-bold uppercase">
              <MapPin className="w-3 h-3" /> {agency?.city || 'Puerto Varas'}
            </div>
            <h1 className="text-3xl font-serif text-pine">Operaciones de hoy</h1>
          </div>
        </div>
        <div className="flex items-center gap-3.5 bg-white rounded-2xl p-2.5 px-4 border border-gray-405/15 shrink-0 shadow-card">
          {loadingWeather ? (
            <span className="text-[10px] text-gray-451">Cargando clima...</span>
          ) : weather ? (
            <div className="flex items-center justify-between w-full gap-4">
              <div>
                <p className="text-[11px] text-gray-850 font-semibold">{weather.description}</p>
                <p className="text-[9px] text-gray-451">V: {weather.wind_speed}km/h | H: {weather.humidity}%</p>
              </div>
              <span className="text-xl font-serif text-pine">{weather.temperature}°C</span>
            </div>
          ) : (
            <span className="text-xs text-gray-405">Clima offline</span>
          )}
        </div>
      </div>

      {weather?.condition === 'tormenta' && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <div>
            <p className="text-sm font-bold text-rose-800">⚠️ ALERTA POR TEMPESTAD</p>
            <p className="text-xs text-rose-600">Se recomienda suspender excursiones de riesgo.</p>
          </div>
        </div>
      )}

      {/* Calendar Tabs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto">
          {[0, 1, 2, 3].map((offset) => {
            const d = new Date(); d.setDate(d.getDate() + offset);
            const dateStr = d.toISOString().split('T')[0];
            const label = offset === 0 ? 'Hoy' : offset === 1 ? 'Mañana' : d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
            return (
              <button key={dateStr} onClick={() => { setSelectedDate(dateStr); setSelectedDeparture(null); setViewMode('list'); }}
                className={`px-4 py-2.5 rounded-full font-medium text-xs whitespace-nowrap cursor-pointer shrink-0 ${selectedDate === dateStr && viewMode === 'list' ? 'bg-pine text-white shadow-pop' : 'bg-white text-gray-505 border border-gray-405/20'}`}>
                {label} <span className="text-[10px] opacity-70">({d.toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })})</span>
              </button>
            );
          })}
          <button onClick={() => setIsDatePickerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-medium text-xs border border-gray-405/20 cursor-pointer shrink-0 bg-white text-gray-505">
            <Calendar className="w-3.5 h-3.5" /> Elegir día...
          </button>
        </div>
        <div className="flex bg-white border border-gray-405/20 rounded-full p-1 shrink-0 self-start md:self-auto">
          <button onClick={() => setViewMode('list')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-pine text-white' : 'text-gray-505'}`}>Día</button>
          <button onClick={() => setViewMode('week')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${viewMode === 'week' ? 'bg-pine text-white' : 'text-gray-505'}`}>Semana</button>
          <button onClick={() => setViewMode('month')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${viewMode === 'month' ? 'bg-pine text-white' : 'text-gray-505'}`}>Mes</button>
        </div>
      </div>

      {viewMode !== 'list' && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => goToAdjacentPeriod(-1)} className="p-2 bg-white border border-gray-405/20 rounded-full cursor-pointer hover:bg-sky-80 transition-colors">
            <ChevronLeft className="w-4 h-4 text-pine" />
          </button>
          <p className="font-serif text-sm text-pine min-w-[160px] text-center capitalize">{periodLabel}</p>
          <button onClick={() => goToAdjacentPeriod(1)} className="p-2 bg-white border border-gray-405/20 rounded-full cursor-pointer hover:bg-sky-80 transition-colors">
            <ChevronRight className="w-4 h-4 text-pine" />
          </button>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="flex flex-col gap-2 md:grid md:grid-cols-7 md:gap-2">
          {weekDays.map((dateStr) => {
            const d = new Date(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const dayDeps = departures.filter(dep => dep.departure_date === dateStr).sort((a, b) => a.departure_time.localeCompare(b.departure_time));
            return (
              <div key={dateStr} onClick={() => openAddDepartureForDate(dateStr)}
                className={`rounded-2xl p-2.5 md:min-h-[170px] flex flex-row md:flex-col gap-2 md:gap-1.5 cursor-pointer transition-colors ${isToday ? 'bg-emerald-150 border-2 border-pine' : 'bg-white border border-gray-405/15 hover:border-pine/40'}`}>
                <div className="flex flex-row md:flex-col items-center gap-1.5 md:gap-0 shrink-0 w-16 md:w-auto">
                  <p className={`text-[9px] font-bold uppercase text-center ${isToday ? 'text-pine' : 'text-gray-451'}`}>{d.toLocaleDateString('es-AR', { weekday: 'short' })}</p>
                  <p className={`text-sm font-serif text-center md:mb-1 ${isToday ? 'text-pine' : 'text-gray-850'}`}>{d.getDate()}</p>
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-w-0">
                  {dayDeps.length === 0 && <p className="text-[10px] text-gray-405 md:hidden">Sin salidas</p>}
                  {dayDeps.map((dep) => {
                    const act = activities.find(a => a.id === dep.activity_id);
                    return (
                      <button key={dep.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedDate(dateStr); setSelectedDeparture(dep); db.getPassengersByDeparture(dep.id).then(setPassengers); setViewMode('list'); }}
                        className="text-left text-[11px] md:text-[10px] leading-tight px-2 py-1.5 rounded-xl bg-sage text-sky hover:bg-pine-hover transition-colors font-semibold truncate cursor-pointer">
                        {dep.departure_time} {act?.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'month' && (
        <>
        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-7 gap-1.5">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((lbl) => (
            <p key={lbl} className="text-[9px] font-bold uppercase text-center text-gray-451 pb-1">{lbl}</p>
          ))}
          {monthDays.map(({ dateStr, inMonth, day }) => {
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const dayDeps = departures.filter(dep => dep.departure_date === dateStr).sort((a, b) => a.departure_time.localeCompare(b.departure_time));
            return (
              <div key={dateStr} onClick={() => openAddDepartureForDate(dateStr)}
                className={`rounded-xl p-1.5 min-h-[80px] flex flex-col gap-1 cursor-pointer transition-colors ${!inMonth ? 'opacity-40' : ''} ${isToday ? 'bg-emerald-150 border-2 border-pine' : 'bg-white border border-gray-405/15 hover:border-pine/40'}`}>
                <p className={`text-[10px] font-serif text-center ${isToday ? 'text-pine' : 'text-gray-850'}`}>{day}</p>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {dayDeps.slice(0, 2).map((dep) => {
                    const act = activities.find(a => a.id === dep.activity_id);
                    return (
                      <button key={dep.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedDate(dateStr); setSelectedDeparture(dep); db.getPassengersByDeparture(dep.id).then(setPassengers); setViewMode('list'); }}
                        className="text-left text-[8px] leading-tight px-1.5 py-1 rounded-lg bg-sage text-sky hover:bg-pine-hover transition-colors font-semibold truncate cursor-pointer">
                        {dep.departure_time} {act?.name}
                      </button>
                    );
                  })}
                  {dayDeps.length > 2 && <span className="text-[8px] text-gray-451 px-1.5">+{dayDeps.length - 2} más</span>}
                </div>
              </div>
            );
          })}
        </div>
        {/* Mobile vertical list: only days within the selected month */}
        <div className="flex flex-col gap-2 md:hidden">
          {monthDays.filter(({ inMonth }) => inMonth).map(({ dateStr, day }) => {
            const d = new Date(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const dayDeps = departures.filter(dep => dep.departure_date === dateStr).sort((a, b) => a.departure_time.localeCompare(b.departure_time));
            return (
              <div key={dateStr} onClick={() => openAddDepartureForDate(dateStr)}
                className={`rounded-2xl p-2.5 flex flex-row gap-2 cursor-pointer transition-colors ${isToday ? 'bg-emerald-150 border-2 border-pine' : 'bg-white border border-gray-405/15 hover:border-pine/40'}`}>
                <div className="flex flex-row items-center gap-1.5 shrink-0 w-16">
                  <p className={`text-[9px] font-bold uppercase text-center ${isToday ? 'text-pine' : 'text-gray-451'}`}>{d.toLocaleDateString('es-AR', { weekday: 'short' })}</p>
                  <p className={`text-sm font-serif text-center ${isToday ? 'text-pine' : 'text-gray-850'}`}>{day}</p>
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-w-0">
                  {dayDeps.length === 0 && <p className="text-[10px] text-gray-405">Sin salidas</p>}
                  {dayDeps.map((dep) => {
                    const act = activities.find(a => a.id === dep.activity_id);
                    return (
                      <button key={dep.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedDate(dateStr); setSelectedDeparture(dep); db.getPassengersByDeparture(dep.id).then(setPassengers); setViewMode('list'); }}
                        className="text-left text-[11px] leading-tight px-2 py-1.5 rounded-xl bg-sage text-sky hover:bg-pine-hover transition-colors font-semibold truncate cursor-pointer">
                        {dep.departure_time} {act?.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
      {/* Main Grid */}
      {viewMode === 'list' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-xl text-pine flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Salidas
              <span className="text-xs px-2 py-0.5 bg-sky text-ocean rounded-full font-bold">{filteredDepartures.length}</span>
            </h2>
            {isAdmin && (
              <button onClick={() => { resetDepartureForm(); setNewDepartureDate(selectedDate); setIsAddDepartureOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-pine text-white rounded-full text-xs font-semibold shadow-sm cursor-pointer hover:bg-pine-hover transition-colors">
                <Plus className="w-3.5 h-3.5" /> Programar
              </button>
            )}
          </div>

          {filteredDepartures.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No hay salidas programadas</p>
            </div>
          ) : (
            filteredDepartures.map((dep) => {
              const act = activities.find(a => a.id === dep.activity_id);
              if (!act) return null;
              const isSelected = selectedDeparture?.id === dep.id;
              const depPassengers = passengers; // Simplificado, en realidad cargaríamos por departure
              const bookedSum = depPassengers.filter(p => p.departure_id === dep.id).reduce((sum, p) => sum + p.pax_count, 0);

              return (
                <div key={dep.id} onClick={() => { setSelectedDeparture(dep); db.getPassengersByDeparture(dep.id).then(setPassengers); }}
                  className={`bg-white rounded-3xl p-4 border transition-all cursor-pointer ${isSelected ? 'ring-2 ring-pine shadow-card' : 'border-gray-100 hover:border-pine/30'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <img src={act.photo_url} alt={act.name} className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                      <div>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          dep.status === 'programada' ? 'bg-emerald-50 text-emerald-700' :
                          dep.status === 'en_curso' ? 'bg-blue-50 text-blue-700' :
                          dep.status === 'finalizada' ? 'bg-gray-100 text-gray-700' : 'bg-rose-50 text-rose-700'
                        }`}>{dep.status}</span>
                        <h3 className="font-semibold text-sm mt-1">{act.name}</h3>
                        <p className="text-xs text-gray-451 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> {dep.departure_time} · {bookedSum}/{act.capacity_max} pasajeros
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        {isAdmin && dep.status !== 'finalizada' && dep.status !== 'cancelada' && (
                          <button onClick={(e) => { e.stopPropagation(); handleOpenEditDeparture(dep); }}
                            title="Editar salida"
                            className="p-1 rounded border bg-white hover:bg-gray-100 text-gray-600 cursor-pointer transition-colors">
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteDeparture(dep, act.name); }}
                            title="Eliminar salida"
                            className="p-1 rounded border bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 cursor-pointer transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-pine' : 'text-gray-300'}`} />
                      </div>
                      {dep.status !== 'cancelada' && weather?.condition === 'tormenta' && (
                        <button onClick={(e) => { e.stopPropagation(); handleWeatherSuspension(dep.id); }}
                          className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 cursor-pointer hover:bg-rose-100 transition-colors">
                          <AlertTriangle className="w-2.5 h-2.5 inline" /> Suspender
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
                      <User className="w-3.5 h-3.5 text-ocean shrink-0" />
                      <div className="flex items-center gap-1 flex-wrap">
                        {getDepartureGuideNames(dep).length > 0 ? (
                          getDepartureGuideNames(dep).map((name, i) => (
                            <span key={i} className="font-medium text-gray-700 border border-gray-100 bg-gray-50 px-1.5 py-0.5 rounded">{name}</span>
                          ))
                        ) : (
                          <span>Sin guía</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {dep.status === 'programada' && (
                        <button onClick={() => handleUpdateStatus(dep.id, 'en_curso')} className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-semibold cursor-pointer hover:bg-blue-700 transition-colors">Comenzar</button>
                      )}
                      {dep.status === 'en_curso' && (
                        <button onClick={() => handleUpdateStatus(dep.id, 'finalizada')} className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-semibold cursor-pointer hover:bg-emerald-700 transition-colors">Finalizar</button>
                      )}
                    </div>
                  </div>
                  {isSelected && <div className="lg:hidden mt-4 pt-4 border-t">{renderPassengerList(dep)}</div>}
                </div>
              );
            })
          )}
        </div>

        <div className="hidden lg:block lg:col-span-5">
          {!selectedDeparture ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold">Selecciona una excursión</p>
            </div>
          ) : renderPassengerList(selectedDeparture)}
        </div>
      </div>
      )}

      {/* MODAL: Add/Edit Departure */}
      {isAddDepartureOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="absolute inset-0" onClick={() => { setIsAddDepartureOpen(false); resetDepartureForm(); }} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 my-8">
            <h3 className="font-display font-medium text-lg text-pine mb-4">{editingDepartureId ? 'Editar Salida' : 'Programar Nueva Salida'}</h3>
            <form onSubmit={handleSubmitDeparture} className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-505 mb-1.5">Actividad</p>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-1.5">
                  {activities.map(a => (
                    <button key={a.id} type="button" onClick={() => setNewActivityId(a.id)}
                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${newActivityId === a.id ? 'bg-pine text-white' : 'hover:bg-sky-80'}`}>
                      <img src={a.photo_url || 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=100'} alt={a.name}
                        className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      <span className="text-xs font-semibold truncate">{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" required value={newDepartureDate} onChange={(e) => setNewDepartureDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                <input type="time" required value={newTime} onChange={(e) => setNewTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-505 mb-1.5">Guías</p>
                <div className="border border-gray-200 rounded-xl p-1.5 max-h-32 overflow-y-auto flex flex-col gap-1">
                  {guides.map(g => {
                    const checked = newGuideIds.includes(g.id);
                    return (
                      <button key={g.id} type="button"
                        onClick={() => setNewGuideIds(prev => prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id])}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left cursor-pointer transition-colors ${checked ? 'bg-pine text-white' : 'hover:bg-sky-80'}`}>
                        {g.avatar_url ? (
                          <img src={g.avatar_url} alt={g.full_name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${checked ? 'bg-white/20 text-white' : 'bg-sky-80 text-pine'}`}>
                            {g.full_name?.substr(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-semibold truncate">{g.full_name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notas..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs h-20 resize-none" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setIsAddDepartureOpen(false); resetDepartureForm(); }} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-pine text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-pine-hover transition-colors">{editingDepartureId ? 'Guardar cambios' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Passenger */}
      {isAddPassengerOpen && selectedDeparture && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="absolute inset-0" onClick={() => { setIsAddPassengerOpen(false); resetPassengerForm(); }} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 z-10 my-8">
            <h3 className="font-display font-medium text-lg text-pine mb-4">{editingPassengerId ? 'Editar Pasajero' : 'Registrar Pasajero'}</h3>
            <form onSubmit={handleAddPassenger} className="flex flex-col gap-4">
              <label className="flex items-center gap-2 cursor-pointer bg-sky/20 border border-sky rounded-xl px-3 py-2">
                <input type="checkbox" checked={paxIsGroupBooking} onChange={(e) => setPaxIsGroupBooking(e.target.checked)} className="rounded text-pine" />
                <span className="text-xs font-semibold text-ocean">Es una reserva grupal / de empresa</span>
              </label>
              <input type="text" required placeholder={paxIsGroupBooking ? 'Nombre del representante' : 'Nombre completo'} value={paxName} onChange={(e) => setPaxName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              {paxIsGroupBooking && (
                <input type="text" placeholder="Nombre de la empresa (opcional)" value={paxCompanyName} onChange={(e) => setPaxCompanyName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">WhatsApp {paxIsGroupBooking && 'del representante'}</label>
                  <input type="tel" required placeholder="+56 9 1234 5678" value={paxPhone} onChange={(e) => setPaxPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Cant. Pax</label>
                  <input type="number" required min={1} value={paxCount} onChange={(e) => setPaxCount(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                </div>
              </div>
              {paxIsGroupBooking && (
                <div>
                  <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Lista de integrantes (opcional, un nombre por línea)</label>
                  <textarea value={paxGroupMembersText} onChange={(e) => setPaxGroupMembersText(e.target.value)}
                    placeholder={'Juan Pérez\nMaría López\n...'}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs h-20 resize-none" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Edad" value={paxAge} onChange={(e) => setPaxAge(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                <input type="tel" placeholder="Tel. emergencia" value={paxEmergencyPhone} onChange={(e) => setPaxEmergencyPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Restricciones dietarias" value={paxDietary} onChange={(e) => setPaxDietary(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                <input type="text" placeholder="Alertas médicas" value={paxMedical} onChange={(e) => setPaxMedical(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={paxHasMinor} onChange={(e) => setPaxHasMinor(e.target.checked)} className="rounded text-pine" />
                <span className="text-xs font-semibold">Incluye menor de edad</span>
              </label>
              {paxHasMinor && (
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Nombre menor" value={paxMinorName} onChange={(e) => setPaxMinorName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                  <input type="number" placeholder="Edad menor" value={paxMinorAge} onChange={(e) => setPaxMinorAge(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                </div>
              )}
              <textarea value={paxNotes} onChange={(e) => setPaxNotes(e.target.value)} placeholder="Notas..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs h-14 resize-none" />

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button type="button" onClick={() => setIsWaiverSectionOpen(!isWaiverSectionOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                  <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Datos de salud y declaración de riesgo (opcional)</span>
                  {isWaiverSectionOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {isWaiverSectionOpen && (
                  <div className="p-3 flex flex-col gap-3">
                    <p className="text-[9px] text-gray-400">Si dejas estos campos vacíos, el pasajero podrá completarlos él mismo al firmar la declaración de riesgo.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="RUT o Pasaporte" value={paxRutPassport} onChange={(e) => setPaxRutPassport(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                      <input type="text" placeholder="Nacionalidad" value={paxNationality} onChange={(e) => setPaxNationality(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                    </div>
                    <input type="text" placeholder="Nombre contacto de emergencia" value={paxEmergencyContactName} onChange={(e) => setPaxEmergencyContactName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={paxPreviousExperience} onChange={(e) => setPaxPreviousExperience(e.target.checked)} className="rounded text-pine" />
                      <span className="text-xs font-semibold">Tiene experiencia previa en la actividad</span>
                    </label>
                    {paxPreviousExperience && (
                      <input type="text" placeholder="Detalle de la experiencia" value={paxPreviousExperienceDetail} onChange={(e) => setPaxPreviousExperienceDetail(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                    )}
                    <input type="text" placeholder="Alergias" value={paxAllergies} onChange={(e) => setPaxAllergies(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                    <input type="text" placeholder="Medicamentos contraindicados" value={paxContraindicatedMeds} onChange={(e) => setPaxContraindicatedMeds(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                    <input type="text" placeholder="Cirugías recientes o lesiones" value={paxRecentInjuries} onChange={(e) => setPaxRecentInjuries(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={paxPregnancy} onChange={(e) => setPaxPregnancy(e.target.checked)} className="rounded text-pine" />
                        <span className="text-xs font-semibold">Embarazo</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={paxHeartConditions} onChange={(e) => setPaxHeartConditions(e.target.checked)} className="rounded text-pine" />
                        <span className="text-xs font-semibold">Problemas cardíacos</span>
                      </label>
                    </div>
                    <input type="text" placeholder="Seguro personal (opcional)" value={paxPersonalInsurance} onChange={(e) => setPaxPersonalInsurance(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setIsAddPassengerOpen(false); resetPassengerForm(); }} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-pine text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-pine-hover transition-colors">{editingPassengerId ? 'Guardar Cambios' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bulk Notify */}
      {isBulkNotifyOpen && selectedDeparture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="absolute inset-0" onClick={() => setIsBulkNotifyOpen(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 z-10">
            <h3 className="font-display font-medium text-lg text-rose-800 mb-4">Alertas de Cancelación</h3>
            <div className="max-h-64 overflow-y-auto flex flex-col gap-2.5 mb-4">
              {passengers.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-6">No hay pasajeros.</p>
              ) : passengers.map(p => {
                const act = activities.find(a => a.id === selectedDeparture.activity_id)!;
                return (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-rose-50 border border-rose-100 rounded-2xl">
                    <div><p className="text-xs font-bold">{p.full_name}</p><p className="text-[10px] font-mono">{p.phone}</p></div>
                    <a href={getPassengerCancellationLink(p, selectedDeparture, act)} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl">Enviar WhatsApp</a>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setIsBulkNotifyOpen(false)} className="px-5 py-2.5 bg-gray-150 text-gray-800 font-bold text-xs rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL: Date Picker */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="absolute inset-0" onClick={() => setIsDatePickerOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 z-10">
            <h3 className="font-display font-semibold text-pine text-md mb-4">Seleccionar Fecha</h3>
            <input type="date" value={selectedDate} onChange={(e) => { if (e.target.value) { setSelectedDate(e.target.value); setSelectedDeparture(null); }}}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-xs mb-4" />
            <div className="grid grid-cols-3 gap-2 mb-4">
              {Array.from({ length: 9 }).map((_, i) => {
                const d = new Date(); d.setDate(d.getDate() + i);
                const dStr = d.toISOString().split('T')[0];
                return (
                  <button key={dStr} onClick={() => { setSelectedDate(dStr); setSelectedDeparture(null); setIsDatePickerOpen(false); }}
                    className={`py-2 rounded-xl text-center text-[10px] border cursor-pointer ${selectedDate === dStr ? 'bg-pine text-white' : 'bg-gray-50 text-gray-700'}`}>
                    <span className="block font-bold">{d.getDate()}</span>
                    <span className="block text-[8px]">{d.toLocaleDateString('es-AR', { weekday: 'short' })}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setIsDatePickerOpen(false)} className="w-full py-2.5 bg-pine text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-pine-hover transition-colors">Aceptar</button>
          </div>
        </div>
      )}
    </div>
  );
}
