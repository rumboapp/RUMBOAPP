import React, { useState, useEffect, useRef } from 'react';
import { CHILE_CITIES, CityItem } from '../lib/cities';
import { MapPin, Search } from 'lucide-react';

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string) => void;
  className?: string;
  placeholder?: string;
}

export function CityAutocomplete({ value, onChange, className = '', placeholder = 'Escribe una localidad de Chile...' }: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCities, setFilteredCities] = useState<CityItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (val.trim()) {
      const filtered = CHILE_CITIES.filter(
        city =>
          city.name.toLowerCase().includes(val.toLowerCase()) ||
          city.region.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredCities(filtered);
      setShowDropdown(true);
    } else {
      setFilteredCities(CHILE_CITIES);
      setShowDropdown(true);
    }
  };

  const handleSelectCity = (city: CityItem) => {
    const displayValue = `${city.name}, ${city.region}`;
    setInputValue(displayValue);
    onChange(displayValue);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400 z-10 pointer-events-none" />
        <input
          type="text"
          className={`w-full border border-gray-200 rounded-xl px-3 py-2.5 pl-10 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30 ${className}`}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            const filtered = inputValue.trim() 
              ? CHILE_CITIES.filter(c => c.name.toLowerCase().includes(inputValue.toLowerCase()) || c.region.toLowerCase().includes(inputValue.toLowerCase()))
              : CHILE_CITIES;
            setFilteredCities(filtered);
            setShowDropdown(true);
          }}
        />
      </div>

      {showDropdown && filteredCities.length > 0 && (
        <div id="city-dropdown" className="absolute left-0 right-0 z-55 mt-1 max-h-56 overflow-y-auto bg-white border border-gray-150 rounded-2xl shadow-xl py-1 divide-y divide-gray-50 animate-in fade-in duration-100">
          {filteredCities.map((city, idx) => (
            <div
              key={idx}
              id={`city-option-${city.name.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleSelectCity(city)}
              className="px-3.5 py-2.5 text-xs text-gray-700 hover:bg-sky/30 hover:text-pine cursor-pointer transition-colors flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-md bg-sky/45 flex items-center justify-center shrink-0">
                <MapPin className="w-3 h-3 text-pine" />
              </div>
              <div className="flex-1 text-left">
                <span className="font-semibold text-gray-900">{city.name}</span>
                <span className="text-[10px] text-gray-405 block leading-none mt-0.5">{city.region}, Chile</span>
              </div>
              <span className="text-[9px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-sm shrink-0">
                {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
