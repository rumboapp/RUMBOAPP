/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { setSimulatedWeatherOverride, getSimulatedWeatherOverride, WeatherInfo } from '../lib/weather';
import { resetDbToDemo, getDb } from '../lib/db';
import { Terminal, Lightbulb, CloudRain, Sun, CloudLightning, RefreshCw, Eye, Code, Database } from 'lucide-react';

export default function SimPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentCondition, setCurrentCondition] = useState<string>('despejado');
  const [dbStats, setDbStats] = useState({ agencies: 0, activities: 0, departures: 0, passengers: 0 });

  const updateStats = () => {
    try {
      const data = getDb();
      setDbStats({
        agencies: data.agencies.length,
        activities: data.activities.length,
        departures: data.departures.length,
        passengers: data.passengers.length
      });
    } catch (_) {}
  };

  useEffect(() => {
    updateStats();
    window.addEventListener('rumbo_db_updated', updateStats);
    
    // Check initial condition
    const override = getSimulatedWeatherOverride();
    if (override) {
      setCurrentCondition(override.condition || 'despejado');
    }

    return () => window.removeEventListener('rumbo_db_updated', updateStats);
  }, []);

  const changeWeather = (cond: 'despejado' | 'lluvia' | 'tormenta' | 'nublado') => {
    setCurrentCondition(cond);
    if (cond === 'despejado') {
      setSimulatedWeatherOverride(null); // Clear override, use live Open-Meteo
    } else if (cond === 'lluvia') {
      setSimulatedWeatherOverride({
        temperature: 9,
        condition: 'lluvia',
        wind_speed: 15,
        humidity: 92,
        description: 'Lluvia leve en toda la zona montañosa.'
      });
    } else if (cond === 'tormenta') {
      setSimulatedWeatherOverride({
        temperature: 5,
        condition: 'tormenta',
        wind_speed: 55,
        humidity: 98,
        description: '⚠️ ALERTA: Tormentas eléctricas y ráfagas severas!'
      });
    } else if (cond === 'nublado') {
      setSimulatedWeatherOverride({
        temperature: 11,
        condition: 'nublado',
        wind_speed: 10,
        humidity: 75,
        description: 'Mayormente cubierto sin vientos fuertes.'
      });
    }
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de reiniciar todos los datos a la demo de fábrica? Tus cambios locales se descartarán.')) {
      resetDbToDemo();
      window.location.reload();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Small floating button */}
      <button
        id="btn-sim-panel"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900 te-white hover:bg-slate-800 text-white font-mono text-xs rounded-full shadow-lg border border-slate-700 font-bold transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        <Terminal className="w-4 h-4 text-orange-400 animate-pulse" />
        {isOpen ? 'Cerrar Consola' : 'Consola de Simulación'}
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 sm:w-96 bg-slate-950 text-slate-300 rounded-2xl p-4 shadow-2xl border border-slate-800 font-mono text-xs max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-orange-400 font-bold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" /> MOCK DATABASE & RIG
            </span>
            <span className="text-[10px] text-slate-500">v1.1 LatAm</span>
          </div>

          {/* Quick Explainer */}
          <div className="bg-slate-900/60 p-2.5 rounded-lg mb-3 border border-slate-800/80">
            <p className="text-[10px] text-orange-300 leading-relaxed flex gap-1.5 items-start">
              <Lightbulb className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Esta consola simula la base de datos Supabase Postgres y el clima en tiempo real para Puerto Varas.</span>
            </p>
          </div>

          {/* Weather override simulator */}
          <div className="mb-4">
            <p className="font-semibold text-slate-400 mb-2 flex items-center gap-1 text-[11px]">
              <CloudRain className="w-3.5 h-3.5 text-blue-400" /> CLIMA SIMULADO (Prueba de Suspensión):
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => changeWeather('despejado')}
                className={`py-1.5 px-2 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentCondition === 'despejado' 
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500' 
                    : 'bg-slate-900 hover:bg-slate-850 border border-transparent'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Open-Meteo
              </button>
              <button
                onClick={() => changeWeather('nublado')}
                className={`py-1.5 px-2 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentCondition === 'nublado' 
                    ? 'bg-sky-950 text-sky-400 border border-sky-500' 
                    : 'bg-slate-900 hover:bg-slate-850 border border-transparent'
                }`}
              >
                ☁️ Nublado
              </button>
              <button
                onClick={() => changeWeather('lluvia')}
                className={`py-1.5 px-2 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentCondition === 'lluvia' 
                    ? 'bg-blue-950 text-blue-400 border border-blue-500' 
                    : 'bg-slate-900 hover:bg-slate-850 border border-transparent'
                }`}
              >
                🌧️ Lluvia Leve
              </button>
              <button
                onClick={() => changeWeather('tormenta')}
                className={`py-1.5 px-2 rounded font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentCondition === 'tormenta' 
                    ? 'bg-red-950 text-red-400 border border-red-500' 
                    : 'bg-slate-900 hover:bg-slate-850 border border-transparent'
                }`}
              >
                <CloudLightning className="w-3.5 h-3.5 text-red-500" /> ⚠️ Tormenta
              </button>
            </div>
            <p className="text-[9px] text-slate-500 mt-1">
              * Elige **Tormenta** para simular la suspensión masiva en el Dashboard y enviar los avisos por WhatsApp.
            </p>
          </div>

          {/* Database stats and actions */}
          <div className="mb-4 bg-slate-900/40 p-2.5 rounded-lg border border-slate-900">
            <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
              💾 ESTADO DE TABLAS LOCALES:
            </p>
            <div className="grid grid-cols-2 gap-y-1 gap-x-3 text-[10px]">
              <div>Agencias: <strong className="text-white">{dbStats.agencies}</strong></div>
              <div>Actividades: <strong className="text-white">{dbStats.activities}</strong></div>
              <div>Salidas: <strong className="text-white">{dbStats.departures}</strong></div>
              <div>Pasajeros (Pax): <strong className="text-white">{dbStats.passengers}</strong></div>
            </div>
            <div className="mt-3 border-t border-slate-800/80 pt-2.5 flex justify-between items-center">
              <span className="text-[9px] text-slate-500">¿Hiciste pruebas erróneas?</span>
              <button
                onClick={handleReset}
                className="py-1 px-2.5 bg-red-900/60 hover:bg-red-900 text-red-200 border border-red-800 rounded font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 text-[10px]"
              >
                <RefreshCw className="w-3 h-3" /> Reiniciar Demo
              </button>
            </div>
          </div>

          {/* Schematics display */}
          <div className="border-t border-slate-800 pt-2 text-[10px]">
            <p className="font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <Code className="w-3.5 h-3.5 text-blue-400" /> TRANSICIÓN A SUPABASE:
            </p>
            <p className="text-slate-500 leading-tight">
              Toda la lógica de triggers RLS, Security Definers y tablas explicados en el manual se ejecutan aquí localmente. Copia la SQL del manual para subirla directamente a Supabase cuando gustes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
