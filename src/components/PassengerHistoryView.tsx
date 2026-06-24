/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useAuth } from '../lib/auth-context';
import { Departure, Passenger, Activity } from '../types';
import { History, Filter, Search, Building2 } from 'lucide-react';

export default function PassengerHistoryView() {
  const { agency } = useAuth();
  const agencyId = agency?.id || '';

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allPassengers, setAllPassengers] = useState<Passenger[]>([]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('');
  const [searchName, setSearchName] = useState('');

  const loadData = async () => {
    if (!agencyId) return;
    setDepartures(await db.getDepartures(agencyId));
    setActivities(await db.getActivities(agencyId));
    setAllPassengers(await db.getAllPassengers());
  };

  useEffect(() => {
    loadData();
    window.addEventListener('rumbo_db_updated', loadData);
    return () => window.removeEventListener('rumbo_db_updated', loadData);
  }, [agencyId]);

  const departuresById = new Map<string, Departure>(departures.map(d => [d.id, d]));
  const activitiesById = new Map<string, Activity>(activities.map(a => [a.id, a]));

  const rows = allPassengers
    .map(p => {
      const dep = departuresById.get(p.departure_id);
      if (!dep) return null;
      const act = activitiesById.get(dep.activity_id);
      if (!act) return null;
      return { passenger: p, departure: dep, activity: act };
    })
    .filter((r): r is { passenger: Passenger; departure: Departure; activity: Activity } => r !== null)
    .filter(r => {
      if (startDate && r.departure.departure_date < startDate) return false;
      if (endDate && r.departure.departure_date > endDate) return false;
      if (activityFilter !== 'all' && r.activity.id !== activityFilter) return false;
      if (companyFilter && !(r.passenger.company_name || '').toLowerCase().includes(companyFilter.toLowerCase())) return false;
      if (searchName && !r.passenger.full_name.toLowerCase().includes(searchName.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.departure.departure_date.localeCompare(a.departure.departure_date));

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-1 sm:px-4">
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-pine flex items-center gap-2"><History className="w-6 h-6" /> Historial de Pasajeros</h1>
          <p className="text-xs text-gray-400 mt-1">Busca pasajeros por fecha, actividad o empresa.</p>
        </div>
        <span className="text-xs font-semibold text-gray-500 bg-gray-50 border px-2.5 py-1 rounded-full self-start md:self-center">{rows.length} registros</span>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-gray-50 border p-1.5 rounded-xl text-xs">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white border rounded px-2 py-0.5 text-[11px]" />
          <span className="text-gray-400">—</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white border rounded px-2 py-0.5 text-[11px]" />
        </div>
        <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} className="text-xs font-semibold bg-gray-50 border rounded-xl px-2.5 py-2 cursor-pointer outline-none">
          <option value="all">Todas las actividades</option>
          {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="flex items-center gap-1.5 bg-gray-50 border rounded-xl px-2.5">
          <Building2 className="w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Empresa..." value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="bg-transparent outline-none text-xs py-2 w-28" />
        </div>
        <div className="flex items-center gap-1.5 bg-gray-50 border rounded-xl px-2.5">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Nombre pasajero..." value={searchName} onChange={(e) => setSearchName(e.target.value)} className="bg-transparent outline-none text-xs py-2 w-32" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <History className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold">No hay pasajeros que coincidan con esos filtros</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 uppercase text-[9px] font-bold">
                <th className="text-left px-4 py-3">Pasajero</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-left px-4 py-3">Actividad</th>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Empresa</th>
                <th className="text-left px-4 py-3">Pax</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ passenger, departure, activity }) => (
                <tr key={passenger.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-semibold text-gray-800">{passenger.full_name}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">{passenger.phone}</td>
                  <td className="px-4 py-3">{activity.name}</td>
                  <td className="px-4 py-3 font-mono">{departure.departure_date}</td>
                  <td className="px-4 py-3 text-gray-500">{passenger.company_name || '—'}</td>
                  <td className="px-4 py-3"><span className="bg-sky text-ocean font-bold px-2 py-0.5 rounded-full">{passenger.pax_count}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
