/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth-context';
import { Departure, Passenger, Activity, Guide } from '../types';
import { TrendingUp, Users, DollarSign, Calendar, Milestone, Sparkles, Filter, Award, Baby, CalendarDays, HeartPulse, Utensils } from 'lucide-react';

export default function ReportsView() {
  const { agency } = useAuth();
  const agencyId = agency?.id || '';

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [allPassengers, setAllPassengers] = useState<Passenger[]>([]);
  const [dateRange, setDateRange] = useState<'all' | 'past' | 'future' | 'today' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    if (!agencyId) return;
    setDepartures(await db.getDepartures(agencyId));
    setActivities(await db.getActivities(agencyId));
    setGuides(await db.getGuides(agencyId));
    setAllPassengers(await db.getAllPassengers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('rumbo_db_updated', loadData);
    return () => window.removeEventListener('rumbo_db_updated', loadData);
  }, [agencyId]);

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
    return true;
  });

  const totalTours = filteredDeps.length;
  const completedTours = filteredDeps.filter(d => d.status === 'finalizada').length;
  const canceledTours = filteredDeps.filter(d => d.status === 'cancelada').length;

  let totalPassengersCount = 0;
  let totalProjectedMoney = 0;
  let totalMinorsCount = 0;
  let totalAdultsCount = 0;
  const dietaryFrequency: { [key: string]: number } = {};
  const medicalAlertsList: { passengerName: string; issue: string; departureName: string }[] = [];
  const bookingsByDate: { [key: string]: { count: number; reservations: number } } = {};
  const activityDistribution: { [key: string]: { count: number; name: string; income: number } } = {};
  const guideAssignments: { [key: string]: { count: number; name: string } } = {};

  filteredDeps.forEach(dep => {
    const act = activities.find(a => a.id === dep.activity_id);
    if (!act) return;
    const depPassengers = allPassengers.filter(p => p.departure_id === dep.id);
    const passengerSum = depPassengers.reduce((sum, p) => sum + p.pax_count, 0);
    totalPassengersCount += passengerSum;
    if (dep.status !== 'cancelada') totalProjectedMoney += passengerSum * act.price;

    depPassengers.forEach(p => {
      if (p.has_minor) { totalMinorsCount += 1; totalAdultsCount += Math.max(0, p.pax_count - 1); }
      else { totalAdultsCount += p.pax_count; }
      if (p.dietary_restrictions) { dietaryFrequency[p.dietary_restrictions.trim()] = (dietaryFrequency[p.dietary_restrictions.trim()] || 0) + 1; }
      if (p.medical_issues) { medicalAlertsList.push({ passengerName: p.full_name, issue: p.medical_issues, departureName: act.name }); }
      if (!bookingsByDate[dep.departure_date]) bookingsByDate[dep.departure_date] = { count: 0, reservations: 0 };
      bookingsByDate[dep.departure_date].count += p.pax_count;
      bookingsByDate[dep.departure_date].reservations += 1;
    });

    if (!activityDistribution[act.id]) activityDistribution[act.id] = { count: 0, name: act.name, income: 0 };
    activityDistribution[act.id].count += passengerSum;
    if (dep.status !== 'cancelada') activityDistribution[act.id].income += passengerSum * act.price;

    if (dep.guide_id) {
      const g = guides.find(gd => gd.id === dep.guide_id);
      const gName = g ? g.full_name : 'Guía';
      if (!guideAssignments[dep.guide_id]) guideAssignments[dep.guide_id] = { count: 0, name: gName };
      guideAssignments[dep.guide_id].count += 1;
    }
  });

  const sortedDates = Object.entries(bookingsByDate).map(([date, data]) => ({ date, count: data.count, reservations: data.reservations })).sort((a, b) => b.count - a.count).slice(0, 5);
  const sortedActivities = Object.values(activityDistribution).sort((a, b) => b.count - a.count);
  const maxActivityPax = sortedActivities.length > 0 ? Math.max(...sortedActivities.map(a => a.count)) : 1;
  const sortedGuides = Object.values(guideAssignments).sort((a, b) => b.count - a.count);
  const isFreePlan = (agency?.subscription_plan || 'free') === 'free';

  const renderLockOverlay = (planRequired: 'premium' | 'pro' = 'premium') => (
    <div className="absolute inset-x-0 bottom-0 top-[60px] bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center text-center p-5 z-20 rounded-b-2xl border-t border-dashed border-gray-100">
      <Sparkles className="w-8 h-8 text-pine animate-pulse mb-1.5" />
      <h4 className="text-xs font-bold text-gray-800">Analítica Avanzada</h4>
      <p className="text-[10px] text-gray-500 mt-1">Requiere Plan {planRequired === 'pro' ? 'Pro' : 'Premium'}.</p>
      <button onClick={() => window.dispatchEvent(new Event('rumbo_open_pricing'))} className="mt-3 px-3 py-1 bg-pine text-white font-bold rounded-lg text-[9px]">Mejorar</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-1 sm:px-4">
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-display font-medium text-pine">Métricas & Reportes</h1></div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)} className="text-xs font-semibold bg-transparent outline-none cursor-pointer">
              <option value="all">Todas</option><option value="today">Hoy</option><option value="past">Pasadas</option><option value="future">Próximas</option><option value="custom">Rango...</option>
            </select>
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-1.5 bg-gray-50 border p-1.5 rounded-xl text-xs">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white border rounded px-2 py-0.5 text-[11px]" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white border rounded px-2 py-0.5 text-[11px]" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl"><DollarSign className="w-6 h-6" /></div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Ingresos Estimados</span>
            <span className="text-xl font-bold text-pine">{totalProjectedMoney.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl"><Users className="w-6 h-6" /></div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Pasajeros</span>
            <span className="text-xl font-bold text-pine">{totalPassengersCount} pax</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl"><Calendar className="w-6 h-6" /></div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Salidas</span>
            <span className="text-xl font-bold text-pine">{totalTours} viajes</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Efectividad</span>
            <span className="text-xl font-bold text-pine">{totalTours > 0 ? Math.round(((totalTours - canceledTours) / totalTours) * 100) : 100}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-pine text-md flex items-center gap-2"><Milestone className="w-5 h-5" /> Ocupación por Excursión</h3>
          <div className="flex flex-col gap-4 mt-6">
            {sortedActivities.length === 0 ? <p className="text-xs text-center text-gray-400 py-12">Sin datos</p> : sortedActivities.map((actItem, idx) => {
              const percentage = Math.round((actItem.count / maxActivityPax) * 100);
              return (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-semibold"><span>{actItem.name}</span><span>{actItem.count} pax | {actItem.income.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })}</span></div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-pine to-ocean rounded-full" style={{ width: `${Math.max(percentage, 5)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
          {isFreePlan && renderLockOverlay('premium')}
          <h3 className="font-semibold text-pine text-md flex items-center gap-2"><Award className="w-5 h-5 text-orange-500" /> Desempeño por Guía</h3>
          <div className="flex flex-col mt-6 divide-y divide-gray-50">
            {sortedGuides.length === 0 ? <p className="text-xs text-center py-12">Sin guías asignados</p> : sortedGuides.map((g, idx) => (
              <div key={idx} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2"><span className="w-6 h-6 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-lg flex items-center justify-center">#{idx+1}</span><strong className="text-xs">{g.name}</strong></div>
                <span className="text-xs bg-sky text-ocean font-mono font-bold px-2.5 py-1 rounded-xl">{g.count} Despachos</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
          {isFreePlan && renderLockOverlay('pro')}
          <h3 className="font-semibold text-pine text-md flex items-center gap-2"><Baby className="w-5 h-5" /> Demografía</h3>
          <div className="flex flex-col gap-4 mt-5">
            <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-xs">Adultos</span><strong className="text-sm font-mono">{totalAdultsCount}</strong></div>
            <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-xs">Menores</span><strong className="text-sm font-mono">{totalMinorsCount}</strong></div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="bg-pine h-full" style={{ width: `${totalPassengersCount > 0 ? (totalAdultsCount / totalPassengersCount) * 100 : 100}%` }} />
              <div className="bg-indigo-500 h-full" style={{ width: `${totalPassengersCount > 0 ? (totalMinorsCount / totalPassengersCount) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
          {isFreePlan && renderLockOverlay('pro')}
          <h3 className="font-semibold text-pine text-md flex items-center gap-2"><CalendarDays className="w-5 h-5" /> Fechas de Mayor Volumen</h3>
          <div className="flex flex-col gap-3.5 mt-5">
            {sortedDates.length === 0 ? <p className="text-xs text-center py-8">Sin datos</p> : sortedDates.map((item, dIdx) => {
              const dateObj = new Date(item.date + 'T12:00:00');
              return (
                <div key={dIdx} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2">
                  <span className="font-medium">{dateObj.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className="text-pine font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">{item.count} pasajeros</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
          {isFreePlan && renderLockOverlay('pro')}
          <h3 className="font-semibold text-pine text-md flex items-center gap-2"><HeartPulse className="w-5 h-5 text-rose-500" /> Alertas de Salud</h3>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border"><strong className="text-lg font-mono">{medicalAlertsList.length}</strong><span className="text-[9px] block">Avisos Médicos</span></div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border"><strong className="text-lg font-mono">{Object.keys(dietaryFrequency).length}</strong><span className="text-[9px] block">Dietas</span></div>
          </div>
          <div className="flex flex-col gap-2 mt-3 max-h-36 overflow-y-auto">
            {Object.entries(dietaryFrequency).map(([key, value], index) => (
              <span key={index} className="px-2 py-0.5 bg-gray-50 border text-gray-700 text-[10px] rounded-full"><Utensils className="w-2.5 h-2.5 inline" /> {key} ({value})</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
