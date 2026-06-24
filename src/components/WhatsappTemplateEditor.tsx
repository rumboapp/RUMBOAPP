/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Eye } from 'lucide-react';

const PLACEHOLDERS: { tag: string; label: string; sample: string }[] = [
  { tag: '{pasajero}', label: 'Nombre pasajero', sample: 'Juan Pérez' },
  { tag: '{actividad}', label: 'Actividad', sample: 'Rafting Río Petrohué' },
  { tag: '{fecha}', label: 'Fecha', sample: '24/06' },
  { tag: '{hora}', label: 'Hora', sample: '09:00' },
  { tag: '{punto_encuentro}', label: 'Punto de encuentro', sample: 'Oficina Rumbo Puerto Varas' },
  { tag: '{pasajeros}', label: 'Cant. de pax', sample: '2' },
];

const DEFAULT_TEMPLATE = `Hola *{pasajero}*, te recordamos tu excursión con *Rumbo*:

🚢 Excursión: {actividad}
📅 Fecha: {fecha}
⏰ Hora: {hora}hs
📍 Punto de encuentro: {punto_encuentro}
👥 Lugar para: {pasajeros} pax

¡Te esperamos!`;

interface WhatsappTemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function WhatsappTemplateEditor({ value, onChange, disabled }: WhatsappTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertPlaceholder = (tag: string) => {
    const el = textareaRef.current;
    if (!el) { onChange(value + tag); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + tag + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + tag.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const preview = PLACEHOLDERS.reduce(
    (text, p) => text.split(p.tag).join(p.sample),
    value && value.trim() ? value : DEFAULT_TEMPLATE
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PLACEHOLDERS.map(p => (
          <button key={p.tag} type="button" disabled={disabled} onClick={() => insertPlaceholder(p.tag)}
            title={`Insertar ${p.tag}`}
            className="px-2 py-1 bg-sky/50 text-ocean text-[10px] font-semibold rounded-lg border border-sky cursor-pointer hover:bg-sky transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            + {p.label}
          </button>
        ))}
      </div>
      <textarea ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        placeholder={DEFAULT_TEMPLATE}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs h-28 resize-none disabled:bg-gray-50 disabled:text-gray-400" />
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-gray-400">Toca los botones de arriba para agregar datos del pasajero sin escribirlos a mano.</p>
        {!disabled && (
          <button type="button" onClick={() => onChange(DEFAULT_TEMPLATE)} className="text-[9px] font-semibold text-pine hover:underline cursor-pointer shrink-0 ml-2">
            Usar mensaje sugerido
          </button>
        )}
      </div>
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
        <p className="text-[9px] font-bold text-emerald-700 uppercase flex items-center gap-1 mb-1.5"><Eye className="w-3 h-3" /> Así se verá en WhatsApp</p>
        <p className="text-[11px] text-gray-700 whitespace-pre-wrap">{preview}</p>
      </div>
    </div>
  );
}
