export interface CityItem {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
}

export const CHILE_CITIES: CityItem[] = [
  { name: 'Santiago', region: 'Metropolitana', latitude: -33.4489, longitude: -70.6693 },
  { name: 'Pucón', region: 'La Araucanía', latitude: -39.2667, longitude: -71.9667 },
  { name: 'Puerto Varas', region: 'Los Lagos', latitude: -41.3200, longitude: -72.9800 },
  { name: 'Puerto Natales / Torres del Paine', region: 'Magallanes', latitude: -51.7269, longitude: -72.5061 },
  { name: 'San Pedro de Atacama', region: 'Antofagasta', latitude: -22.9100, longitude: -68.2000 },
  { name: 'Coyhaique', region: 'Aysén', latitude: -45.5712, longitude: -72.0685 },
  { name: 'Valdivia', region: 'Los Ríos', latitude: -39.8142, longitude: -73.2459 },
  { name: 'Castro (Chiloé)', region: 'Los Lagos', latitude: -42.4721, longitude: -73.7732 },
  { name: 'Puerto Montt', region: 'Los Lagos', latitude: -41.4689, longitude: -72.9411 },
  { name: 'Punta Arenas', region: 'Magallanes', latitude: -53.1638, longitude: -70.9171 },
  { name: 'La Serena', region: 'Coquimbo', latitude: -29.9027, longitude: -71.2522 },
  { name: 'Iquique', region: 'Tarapacá', latitude: -20.2133, longitude: -70.1502 },
  { name: 'Valparaíso / Viña del Mar', region: 'Valparaíso', latitude: -33.0472, longitude: -71.6127 },
  { name: 'Bariloche', region: 'Río Negro (Argentina)', latitude: -41.1343, longitude: -71.3085 }
];

export function getCoordinatesForCity(cityInput: string): { latitude: number; longitude: number } {
  const cleanInput = cityInput.toLowerCase().trim();
  
  // Try to find exact or partial match
  const match = CHILE_CITIES.find(
    c => cleanInput.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(cleanInput)
  );

  if (match) {
    return { latitude: match.latitude, longitude: match.longitude };
  }

  // Default to Santiago if not found
  return { latitude: -33.4489, longitude: -70.6693 };
}
