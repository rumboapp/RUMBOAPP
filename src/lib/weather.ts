/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WeatherInfo {
  temperature: number;
  condition: string; // 'despejado' | 'nublado' | 'lluvia' | 'tormenta' | 'nieve'
  wind_speed: number;
  humidity: number;
  description: string;
  isSimulated: boolean;
}

// Simple in-memory override state so they can instantly toggle rain/storms inside the UI to test suspension!
let simulatedWeatherOverride: Partial<WeatherInfo> | null = null;

export function setSimulatedWeatherOverride(override: Partial<WeatherInfo> | null) {
  simulatedWeatherOverride = override;
  window.dispatchEvent(new Event('rumbo_weather_updated'));
}

export function getSimulatedWeatherOverride(): Partial<WeatherInfo> | null {
  return simulatedWeatherOverride;
}

/**
 * Fetches real meteorological data from Open-Meteo API based on coordinates,
 * with graceful in-memory overrides for demonstration.
 */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherInfo> {
  // If there's a manual simulation toggle active for testing, return it first!
  if (simulatedWeatherOverride) {
    return {
      temperature: simulatedWeatherOverride.temperature ?? 14,
      condition: simulatedWeatherOverride.condition ?? 'despejado',
      wind_speed: simulatedWeatherOverride.wind_speed ?? 12,
      humidity: simulatedWeatherOverride.humidity ?? 65,
      description: simulatedWeatherOverride.description ?? 'Condiciones simuladas para pruebas.',
      isSimulated: true
    };
  }

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
    );
    if (!response.ok) throw new Error('API failure');
    const data = await response.json();

    const current = data.current;
    if (!current) throw new Error('No current details');

    const temp = Math.round(current.temperature_2m);
    const wind = Math.round(current.wind_speed_10m);
    const humidity = current.relative_humidity_2m;
    const code = current.weather_code;

    // Map weather code from WMO Codes list
    let condition = 'despejado';
    let description = 'Cielo Despejado';

    if (code === 0) {
      condition = 'despejado';
      description = 'Cielo Limpio / Despejado';
    } else if (code >= 1 && code <= 3) {
      condition = 'nublado';
      description = 'Parcialmente Nublado';
    } else if (code >= 51 && code <= 67) {
      condition = 'lluvia';
      description = 'Llovizna / Lluvia Leve';
    } else if (code >= 80 && code <= 82) {
      condition = 'lluvia';
      description = 'Chaparrones de Lluvia';
    } else if (code >= 95 && code <= 99) {
      condition = 'tormenta';
      description = '⚠️ Tormentas Eléctricas Activas';
    } else if (code >= 71 && code <= 77) {
      condition = 'nieve';
      description = 'Nieve en la zona';
    } else {
      condition = 'nublado';
      description = 'Mayormente Cubierto';
    }

    return {
      temperature: temp,
      condition,
      wind_speed: wind,
      humidity,
      description,
      isSimulated: false
    };

  } catch (error) {
    console.warn('Could not fetch from open-meteo, returning realistic local backup:', error);
    // Return high quality localized austral default
    return {
      temperature: 8,
      condition: 'nublado',
      wind_speed: 25,
      humidity: 80,
      description: 'Lloviznas Intermitentes (Clima Austral)',
      isSimulated: true
    };
  }
}
