/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FALLBACK = 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800';

/**
 * Mini-carrusel para la galería de fotos de una actividad (páginas públicas).
 * Con una sola foto se comporta como una imagen normal, sin controles.
 */
export function PhotoCarousel({ photos, alt, heightClass = 'h-48', children }: {
  photos: string[];
  alt: string;
  heightClass?: string;
  children?: React.ReactNode;
}) {
  const list = photos.filter(Boolean);
  const [index, setIndex] = useState(0);
  const current = list[Math.min(index, Math.max(list.length - 1, 0))] || FALLBACK;

  const go = (delta: number) => setIndex(i => (i + delta + list.length) % list.length);

  return (
    <div className={`relative ${heightClass} bg-gray-100 overflow-hidden`}>
      <img src={current} alt={alt} className="w-full h-full object-cover" />
      {list.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Foto anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Foto siguiente"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center cursor-pointer transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {list.map((_, i) => (
              <button key={i} type="button" onClick={() => setIndex(i)} aria-label={`Foto ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${i === index ? 'bg-white w-4' : 'bg-white/60'}`} />
            ))}
          </div>
        </>
      )}
      {children}
    </div>
  );
}
