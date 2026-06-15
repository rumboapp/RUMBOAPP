/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth-context';
import { Departure, Passenger, Activity, Guide } from '../types';
import { TrendingUp, Users, DollarSign, Calendar, Milestone, Sparkles, Filter, Award, HeartPulse, Utensils, Baby, CalendarDays, FileText } from 'lucide-react';

export default function ReportsView() {
  const { agency } = useAuth();
  const agencyId = agency?.id || '';

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [allPassengers, setAllPassengers] = useState<Passenger[]>([]);
  
  // Date range filter
  const [dateRange, setDateRange] = useState<'all' | 'past' | 'future' | 'today' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = () => {
    if (!agencyId) return;
    setDepartures(db.getDepartures(agencyId));
    setActivities(db.getActivities(agencyId));
    setGuides(db.getGuides(agencyId));
    setAllPassengers(db.getAllPassengers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('rumbo_db_updated', loadData);
    return () => window.removeEventListener('rumbo_db_updated', loadData);
  }, [agencyId]);

  // Apply range filter dynamically
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredDeps = departures.filter(dep => {
    if (dateRange === 'today') return dep.departure_date === todayStr;
    if (dateRange === 'past') return dep.departure_date < todayStr;
    if (dateRange === 'future') return dep.departure_date >= todayStr;
    if (dateRange === 'custom') {
      if (startDate && dep.departure_date < startDate) return false;
      if (endDate && dep.departure_date > endDate) return false;
      return true;
    }
    return true; // Use all
  });

  // Calculate statistics based on filtered departures
  const totalTours = filteredDeps.length;
  const completedTours = filteredDeps.filter(d => d.status === 'finalizada').length;
  const activeTours = filteredDeps.filter(d => d.status === 'en_curso').length;
  const scheduledTours = filteredDeps.filter(d => d.status === 'programada').length;
  const canceledTours = filteredDeps.filter(d => d.status === 'cancelada').length;

  let totalPassengersCount = 0;
  let totalProjectedMoney = 0;
  let totalMinorsCount = 0;
  let totalAdultsCount = 0;

  const dietaryFrequency: { [key: string]: number } = {};
  const medicalAlertsList: { passengerName: string; issue: string; departureName: string }[] = [];
  const bookingsByDate: { [key: string]: { count: number; reservations: number } } = {};

  // Let's create maps to calculate distributions
  const activityDistribution: { [key: string]: { count: number; name: string; income: number } } = {};
  const guideAssignments: { [key: string]: { count: number; name: string } } = {};

  filteredDeps.forEach(dep => {
    const act = activities.find(a => a.id === dep.activity_id);
    if (!act) return;

    // Get passengers for this departure
    const depPassengers = allPassengers.filter(p => p.departure_id === dep.id);
    const passengerSum = depPassengers.reduce((sum, p) => sum + p.pax_count, 0);

    totalPassengersCount += passengerSum;

    if (dep.status !== 'cancelada') {
      totalProjectedMoney += passengerSum * act.price;
    }

    // Demographics and alerts accumulation
    depPassengers.forEach(p => {
      // 1. Adults vs Minors
      if (p.has_minor) {
        totalMinorsCount += 1;
        totalAdultsCount += Math.max(0, p.pax_count - 1);
      } else {
        totalAdultsCount += p.pax_count;
      }

      // 2. Dietary Restrictions
      if (p.dietary_restrictions) {
        const dClean = p.dietary_restrictions.trim();
        dietaryFrequency[dClean] = (dietaryFrequency[dClean] || 0) + 1;
      }

      // 3. Medical Warnings
      if (p.medical_issues) {
        medicalAlertsList.push({
          passengerName: p.full_name,
          issue: p.medical_issues,
          departureName: act.name
        });
      }

      // 4. Booking Frequency by Date
      if (!bookingsByDate[dep.departure_date]) {
        bookingsByDate[dep.departure_date] = { count: 0, reservations: 0 };
      }
      bookingsByDate[dep.departure_date].count += p.pax_count;
      bookingsByDate[dep.departure_date].reservations += 1;
    });

    // Activity stats
    if (!activityDistribution[act.id]) {
      activityDistribution[act.id] = { count: 0, name: act.name, income: 0 };
    }
    activityDistribution[act.id].count += passengerSum;
    if (dep.status !== 'cancelada') {
      activityDistribution[act.id].income += passengerSum * act.price;
    }

    // Guide stats
    if (dep.guide_id) {
      const g = guides.find(gd => gd.id === dep.guide_id);
      const gName = g ? g.full_name : 'Guía Registrado';
      if (!guideAssignments[dep.guide_id]) {
        guideAssignments[dep.guide_id] = { count: 0, name: gName };
      }
      guideAssignments[dep.guide_id].count += 1;
    }
  });

  // Calculate top booking dates
  const sortedDates = Object.entries(bookingsByDate)
    .map(([date, data]) => ({ date, count: data.count, reservations: data.reservations }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Convert distribution map to array and sort
  const sortedActivities = Object.values(activityDistribution).sort((a,b) => b.count - a.count);
  const maxActivityPax = sortedActivities.length > 0 ? Math.max(...sortedActivities.map(a => a.count)) : 1;

  const sortedGuides = Object.values(guideAssignments).sort((a,b) => b.count - a.count);

  const isFreePlan = (agency?.subscription_plan || 'free') === 'free';

  const renderLockOverlay = (planRequired: 'premium' | 'pro' = 'premium') => (
    <div className="absolute inset-x-0 bottom-0 top-[60px] bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center text-center p-5 z-20 rounded-b-2xl border-t border-dashed border-gray-100 select-none">
      <Sparkles className="w-8 h-8 text-pine animate-pulse mb-1.5 shrink-0" />
      <h4 className="text-xs font-bold text-gray-800 leading-tight">Analítica Avanzada Protegida</h4>
      <p className="text-[10px] text-gray-500 max-w-[200px] mt-1 leading-normal mx-auto">
        El desglose de {planRequired === 'pro' ? 'demografía, fechas pico y alertas médicas' : 'desempeño y volumen por guía'} requiere un Plan {planRequired === 'pro' ? 'Pro' : 'Premium'} o superior.
      </p>
      <button
        onClick={() => {
          window.dispatchEvent(new Event('rumbo_open_pricing'));
        }}
        className="mt-3 px-3 py-1 bg-pine hover:bg-pine/90 text-white font-bold rounded-lg text-[9px] uppercase tracking-wider active:scale-95 transition-transform cursor-pointer shadow-3xs"
      >
        Mejorar Membresía
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-1 sm:px-4">
      {/* 1. Header with Filters */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-left">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-medium text-pine">
            Métricas & Reportes
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Visualiza estadísticas de ocupación de salidas, volumen de pasajeros y rendimiento corporativo.
          </p>
        </div>

        {/* Date Filter selector */}
        <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="text-xs font-semibold text-gray-700 bg-transparent outline-none cursor-pointer border-none"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Solo hoy</option>
              <option value="past">Salidas pasadas</option>
              <option value="future">Próximas programadas</option>
              <option value="custom">Rango de fechas...</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 border border-gray-100 p-1.5 rounded-xl text-xs font-semibold text-gray-750 animate-in fade-in slide-in-from-top-1">
              <span className="text-gray-400 text-[10px] uppercase font-bold">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-gray-200 rounded px-2 py-0.5 ml-1 text-[11px] font-mono outline-none focus:ring-1 focus:ring-pine/30"
              />
              <span className="text-gray-400 text-[10px] uppercase font-bold ml-1.5">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-gray-200 rounded px-2 py-0.5 ml-1 text-[11px] font-mono outline-none focus:ring-1 focus:ring-pine/30"
              />
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        {/* Card 1: Projected Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Ingresos Estimados</span>
            <span className="text-xl font-display font-bold text-pine mt-0.5 block">
              {totalProjectedMoney.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-gray-451 mt-0.5 block mb-1">Basado en reservas activas</span>
          </div>
        </div>

        {/* Card 2: Total Passengers */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Pasajeros Totales</span>
            <span className="text-xl font-display font-bold text-pine mt-0.5 block">
              {totalPassengersCount} pax
            </span>
            <span className="text-[10px] text-gray-451 mt-0.5 block mb-1">Registrados en excursiones</span>
          </div>
        </div>

        {/* Card 3: Scheduled departures */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Salidas Totales</span>
            <span className="text-xl font-display font-bold text-pine mt-0.5 block">
              {totalTours} viajes
            </span>
            <span className="text-[10px] text-gray-451 mt-0.5 block mb-1">
              {completedTours} completados | {canceledTours} llov/susp.
            </span>
          </div>
        </div>

        {/* Card 4: Operating Ratio */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Efectividad Operativa</span>
            <span className="text-xl font-display font-bold text-pine mt-0.5 block">
              {totalTours > 0 ? Math.round(((totalTours - canceledTours) / totalTours) * 100) : 100}%
            </span>
            <span className="text-[10px] text-gray-451 mt-0.5 block mb-1">Tasa de salidas realizadas</span>
          </div>
        </div>
      </div>

      {/* 3. Deep Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Popular Activities Custom bar diagram (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between text-left">
          <div>
            <h3 className="font-semibold text-pine text-md flex items-center gap-2">
              <Milestone className="w-5 h-5 text-ocean" />
              Ocupación por Excursión (Volumen Pasajeros)
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              Proporción de inscriptos totales recibidos en cada aventura. Utilízalo para optimizar tus guías.
            </p>
          </div>

          <div className="flex flex-col gap-4 mt-6">
            {sortedActivities.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Sin datos registrados para graficar</p>
              </div>
            ) : (
              sortedActivities.map((actItem, idx) => {
                const percentage = Math.round((actItem.count / maxActivityPax) * 100);
                
                return (
                  <div key={idx} className="flex flex-col gap-1.5">
                    {/* Activity name and stats */}
                    <div className="flex justify-between items-baseline text-xs font-semibold">
                      <span className="text-gray-800 line-clamp-1">{actItem.name}</span>
                      <div className="flex gap-2">
                        <span className="text-pine font-mono font-bold">{actItem.count} pax</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-ocean font-mono">{actItem.income.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>

                    {/* Progress visual bar */}
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pine to-ocean rounded-full transition-all duration-1000"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Key Guide Leaderboard rankings (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between text-left relative overflow-hidden">
          {isFreePlan && renderLockOverlay('premium')}
          <div>
            <h3 className="font-semibold text-pine text-md flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-500" />
              Desempeño y Salidas por Guía
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              Tabla de efectividad y número de despachos de terreno liderados con éxito por guía.
            </p>
          </div>

          <div className="flex flex-col mt-6 divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {sortedGuides.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <p className="text-xs">No hay guías asignados aún.</p>
              </div>
            ) : (
              sortedGuides.map((g, idx) => (
                <div key={idx} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-[10px] rounded-lg flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <strong className="text-xs text-gray-850 leading-tight">{g.name}</strong>
                  </div>

                  <span className="text-xs bg-sky text-ocean font-mono font-bold px-2.5 py-1 rounded-xl">
                    {g.count} Despachos
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="bg-sky/30 border border-sky/40 rounded-xl p-3 text-[10px] text-ocean leading-normal mt-4">
            🏆 <strong>¿Quieres ganar mayor rendimiento?</strong> Planifica los itinerarios terrestres de tu plantilla basándote en la popularidad mensual de excursiones.
          </div>
        </div>

      </div>

      {/* 4. EXTRA RICH ANALYTICS: Demographics, High-Traffic Dates & Safety Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mt-3 text-left">
        
        {/* Panel A: Demographic Distribution (Adults vs Minors) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {isFreePlan && renderLockOverlay('pro')}
          <div>
            <h3 className="font-semibold text-pine text-md flex items-center gap-2">
              <Baby className="w-5 h-5 text-indigo-500" />
              Demografía del Pasajero
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              Desglose entre pasajeros adultos y menores de edad declarados en las reservas vigentes.
            </p>
          </div>

          <div className="flex flex-col gap-4 mt-5">
            <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
              <span className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-pine shrink-0" />
                Adultos titulares / pax
              </span>
              <strong className="text-sm text-gray-850 font-mono">{totalAdultsCount} pax</strong>
            </div>

            <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
              <span className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                Menores de edad
              </span>
              <strong className="text-sm text-gray-850 font-mono">{totalMinorsCount} pax</strong>
            </div>

            {/* Proportion display bar */}
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-gray-400 font-bold mb-1">
                <span>Adultos ({totalPassengersCount > 0 ? Math.round((totalAdultsCount / totalPassengersCount) * 100) : 100}%)</span>
                <span>Copasajeros Menores ({totalPassengersCount > 0 ? Math.round((totalMinorsCount / totalPassengersCount) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div 
                  className="bg-pine h-full" 
                  style={{ width: `${totalPassengersCount > 0 ? (totalAdultsCount / totalPassengersCount) * 100 : 100}%` }} 
                />
                <div 
                  className="bg-indigo-500 h-full" 
                  style={{ width: `${totalPassengersCount > 0 ? (totalMinorsCount / totalPassengersCount) * 100 : 0}%` }} 
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 leading-normal mt-4 bg-gray-50 p-2.5 rounded-xl border border-gray-100/60">
            👦🏻 <strong>Nota:</strong> Los menores de edad requieren arneses pequeños, chalecos de flotación especial y raciones alimentarias reducidas en terreno.
          </p>
        </div>

        {/* Panel B: Top High-booking Calendar dates */}
        <div className="bg-white rounded-xl md:rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {isFreePlan && renderLockOverlay('pro')}
          <div>
            <h3 className="font-semibold text-pine text-md flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-sky-600" />
              Fechas de Mayor Volumen
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              Ranking de las 5 fechas donde se ha registrado mayor tráfico y solicitudes de excursión.
            </p>
          </div>

          <div className="flex flex-col gap-3.5 mt-5">
            {sortedDates.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <p className="text-xs">Sin salidas agendadas aún.</p>
              </div>
            ) : (
              sortedDates.map((item, dIdx) => {
                const dateObj = new Date(item.date + 'T12:00:00');
                const formatted = dateObj.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
                return (
                  <div key={dIdx} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2">
                    <span className="font-medium text-gray-700 capitalize flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-sky/30 border border-sky/40 text-ocean text-[10px] flex items-center justify-center font-mono font-black">
                        {dIdx + 1}
                      </span>
                      {formatted}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-pine font-bold font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-[11px]">
                        {item.count} pasajeros
                      </span>
                      <span className="text-gray-400 text-[10px] font-medium">({item.reservations} res.)</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="text-[10px] text-gray-500 leading-tight bg-[#E8F1F7]/30 border border-[#bcd0e3]/40 rounded-xl p-3 mt-4">
            🔍 <strong>Tráfico histórico:</strong> Monitorea los fines de semana largos para duplicar la guardia de guías disponibles antes de agotar los cupos.
          </div>
        </div>

        {/* Panel C: Medical and Dietary safety briefing counter */}
        <div className="bg-white rounded-xl md:rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {isFreePlan && renderLockOverlay('pro')}
          <div>
            <h3 className="font-semibold text-pine text-md flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-rose-500 animate-pulse shrink-0" />
              Alertas de Terreno & Dietas
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
              Resumen crítico de requerimientos de salud y restricciones alimentarias declaradas.
            </p>
          </div>

          {/* Quick Stats overview */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-100/70">
              <strong className="text-lg font-mono leading-none block">{medicalAlertsList.length}</strong>
              <span className="text-[9px] text-rose-600 block leading-tight mt-0.5 font-bold uppercase tracking-wider">Avisos Médicos</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-850 border border-amber-100/70">
              <strong className="text-lg font-mono leading-none block">{Object.keys(dietaryFrequency).length}</strong>
              <span className="text-[9px] text-amber-700 block leading-tight mt-0.5 font-bold uppercase tracking-wider">Dietarios Diferentes</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-3.5 max-h-36 overflow-y-auto pr-1">
            {/* Dietary lists */}
            {Object.keys(dietaryFrequency).length > 0 && (
              <div className="pb-1">
                <span className="text-[10px] font-bold text-gray-400 block uppercase mb-1">Restricciones registradas:</span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(dietaryFrequency).map(([key, value], index) => (
                    <span key={index} className="px-2 py-0.5 bg-gray-50 border border-gray-200 text-gray-700 text-[10px] rounded-full font-medium inline-flex items-center gap-1">
                      <Utensils className="w-2.5 h-2.5 text-gray-400" />
                      {key} ({value})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medical warnings list detailed */}
            {medicalAlertsList.length > 0 ? (
              <div className="pt-1.5 border-t border-gray-50">
                <span className="text-[10px] font-bold text-rose-600 block uppercase mb-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                  Observaciones sanitarias críticas:
                </span>
                <div className="flex flex-col gap-1.5">
                  {medicalAlertsList.slice(0, 3).map((item, index) => (
                    <div key={index} className="text-[10px] text-gray-700 bg-rose-50/50 p-1.5 rounded border border-rose-100/30">
                      <strong>{item.passengerName}</strong> ({item.departureName}):
                      <span className="italic block mt-0.5">"{item.issue}"</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-300 text-[10px]">
                No hay observaciones de salud urgentes para el periodo.
              </div>
            )}
          </div>

          <div className="mt-3 bg-rose-500 text-white text-[9px] font-extrabold uppercase py-2 px-3 tracking-wider rounded-xl flex items-center gap-1.5 justify-center">
            <HeartPulse className="w-3.5 h-3.5" /> Fichas médicas listas para despacho
          </div>
        </div>

      </div>

      {/* Guide briefing help block footer */}
      <div className="bg-white rounded-2xl p-4 border border-gray-150 flex items-center gap-3.5 text-left mt-1">
        <div className="p-2.5 bg-pine text-white rounded-xl">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-pine leading-none">Generador de Carpetas de Ruta y Soportes Sanitarios</h4>
          <p className="text-[11px] text-gray-400 mt-1 leading-normal">
            Este reporte lee de forma proactiva cada inscripto registrado por tus agentes de ventas. Los guías homologados pueden descargar este despacho resumido de contingencia antes de desconectarse a las sendas de montaña o ríos rápidos de las rutas extremas y el norte chileno.
          </p>
        </div>
      </div>
    </div>
  );
}
