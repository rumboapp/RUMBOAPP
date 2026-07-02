/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

export interface TourStep {
  // Selector del elemento a destacar; null = paso centrado (bienvenida)
  target: string | null;
  title: string;
  text: string;
}

const SPOTLIGHT_PADDING = 8;

/**
 * Tour de bienvenida tipo "spotlight": oscurece la pantalla y destaca
 * elementos reales de la interfaz uno por uno. Los pasos cuyo elemento
 * no exista o no sea visible (ej. layout móvil) se saltan solos.
 */
export default function OnboardingTour({ steps, onFinish }: { steps: TourStep[]; onFinish: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const findVisibleTarget = (selector: string): HTMLElement | null => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
    return candidates.find(el => el.offsetParent !== null) || null;
  };

  // Resolver el paso actual: si su target no está visible, avanzar solo
  const step = steps[stepIndex];

  useLayoutEffect(() => {
    if (!step) return;
    if (!step.target) { setRect(null); return; }
    const el = findVisibleTarget(step.target);
    if (!el) {
      // Elemento no disponible en este layout: saltar el paso
      if (stepIndex < steps.length - 1) setStepIndex(i => i + 1);
      else onFinish();
      return;
    }
    el.scrollIntoView({ block: 'nearest' });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [stepIndex, step?.target]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFinish(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onFinish]);

  if (!step) return null;

  const isLast = stepIndex === steps.length - 1;
  const next = () => (isLast ? onFinish() : setStepIndex(i => i + 1));

  // Posición de la burbuja: debajo del elemento si hay espacio, si no arriba;
  // en pasos centrados (sin target), al centro de la pantalla.
  let tooltipStyle: React.CSSProperties = {};
  if (step.target && rect) {
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > 200 ? rect.bottom + SPOTLIGHT_PADDING + 10 : undefined;
    const bottom = spaceBelow > 200 ? undefined : window.innerHeight - rect.top + SPOTLIGHT_PADDING + 10;
    const idealLeft = rect.left + rect.width / 2 - 150;
    const left = Math.max(12, Math.min(idealLeft, window.innerWidth - 312));
    tooltipStyle = { position: 'fixed', top, bottom, left, width: 300 };
  } else {
    tooltipStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 320, maxWidth: 'calc(100vw - 24px)' };
  }

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Oscurecimiento con recorte alrededor del elemento destacado */}
      {step.target && rect ? (
        <div
          className="fixed rounded-2xl transition-all duration-300 pointer-events-none"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(15, 20, 10, 0.72)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(15,20,10,0.72)]" />
      )}

      {/* Bloqueo de clics fuera del tour */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Burbuja del paso */}
      <div ref={tooltipRef} style={tooltipStyle} className="bg-white rounded-2xl shadow-2xl p-5 z-[91] animate-modal-in">
        <h3 className="font-serif text-lg text-pine">{step.title}</h3>
        <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{step.text}</p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === stepIndex ? 'bg-pine w-4' : 'bg-gray-200'}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={onFinish}
              className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
              Saltar
            </button>
            <button onClick={next}
              className="px-4 py-1.5 bg-pine text-white rounded-xl text-[11px] font-bold cursor-pointer hover:bg-pine-hover transition-colors">
              {isLast ? 'Entendido' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
