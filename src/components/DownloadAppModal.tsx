import React, { useState, useEffect } from 'react';
import { X, Tablet, Apple, Share, PlusSquare, MoreVertical } from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadAppModal({ isOpen, onClose }: DownloadAppModalProps) {
  const [platform, setPlatform] = useState<'android' | 'ios'>('android');

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.userAgent) {
      if (/iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent)) {
        setPlatform('ios');
      } else {
        setPlatform('android');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div id="download-app-modal" className="fixed inset-0 z-55 flex items-start justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto text-left">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 z-10 my-8">

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-slate-50 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-150"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pine/10 text-pine rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
            <Tablet className="w-3.5 h-3.5" /> Acceso Directo
          </span>
          <h2 className="text-xl md:text-2xl font-display font-bold text-pine">
            Agregar Rumbo a tu pantalla de inicio
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Agrega un acceso directo a Rumbo en tu celular para abrirla como una app, a pantalla completa y sin la barra del navegador.
          </p>
        </div>

        <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => setPlatform('android')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              platform === 'android' ? 'bg-white text-pine shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🤖 Android (Chrome)</span>
          </button>
          <button
            onClick={() => setPlatform('ios')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              platform === 'ios' ? 'bg-white text-pine shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iOS (Safari)</span>
          </button>
        </div>

        {platform === 'android' && (
          <div className="space-y-4 text-left">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest font-mono">Guía paso a paso para Android Chrome:</h4>
            <div className="space-y-3.5">
              <div className="flex gap-3 items-start border-b border-gray-50 pb-3">
                <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div>
                  <h5 className="text-xs font-bold text-gray-800">Abre Rumbo en Chrome</h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">Asegúrate de estar navegando desde <strong>Google Chrome</strong>, el navegador por defecto en la mayoría de los celulares Android.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start border-b border-gray-50 pb-3">
                <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <div>
                  <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">Toca el menú <MoreVertical className="w-3.5 h-3.5" /></h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">Presiona los tres puntos verticales arriba a la derecha de la pantalla.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start border-b border-gray-50 pb-3">
                <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <div>
                  <h5 className="text-xs font-bold text-gray-800">Selecciona "Instalar app" o "Agregar a pantalla principal"</h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">El texto exacto varía según tu versión de Chrome, pero busca esa opción en el menú.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
                <div>
                  <h5 className="text-xs font-bold text-gray-800">¡Acceso directo listo!</h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">Confirma tocando "Instalar". El logo de Rumbo aparecerá en tu pantalla principal como una app nativa.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {platform === 'ios' && (
          <div className="space-y-4 text-left">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest font-mono">Guía paso a paso para iOS Safari:</h4>
            <div className="space-y-3.5">
              <div className="flex gap-3 items-start border-b border-gray-50 pb-3">
                <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div>
                  <h5 className="text-xs font-bold text-gray-800">Abre Rumbo en Safari</h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">Asegúrate de estar navegando desde <strong>Safari</strong>. No uses apps integradas como Gmail o Instagram.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start border-b border-gray-50 pb-3">
                <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <div>
                  <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">Toca el botón "Compartir" <Share className="w-3.5 h-3.5" /></h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">Presiona el botón de acción en el pie de página de Safari (un cuadrado con una flecha hacia arriba).</p>
                </div>
              </div>
              <div className="flex gap-3 items-start border-b border-gray-50 pb-3">
                <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <div>
                  <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">Selecciona "Agregar a inicio" <PlusSquare className="w-3.5 h-3.5" /></h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">Desplázate hacia abajo en el menú y selecciona <strong>Agregar a Inicio</strong> (<em>"Add to Home Screen"</em> en inglés).</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
                <div>
                  <h5 className="text-xs font-bold text-gray-800">¡Acceso directo listo!</h5>
                  <p className="text-[11px] text-gray-500 mt-0.5">Presiona "Agregar" arriba a la derecha. El logo de Rumbo aparecerá en tu pantalla principal como una app nativa.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-5 mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-150 text-gray-800 text-xs font-bold rounded-xl cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
