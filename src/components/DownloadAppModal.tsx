import React, { useState, useEffect } from 'react';
import { X, Tablet, Download, Check, Sparkles, Apple, Compass, Info, ArrowUpRight } from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadAppModal({ isOpen, onClose }: DownloadAppModalProps) {
  const [platform, setPlatform] = useState<'android' | 'ios'>('android');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilePercent, setCompilePercent] = useState(0);
  const [apkReady, setApkReady] = useState(false);

  useEffect(() => {
    // Basic auto-detection if on device
    if (typeof window !== 'undefined' && navigator.userAgent) {
      if (/iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent)) {
        setPlatform('ios');
      } else {
        setPlatform('android');
      }
    }
  }, [isOpen]);

  const triggerApkPackaging = () => {
    setIsCompiling(true);
    setCompilePercent(10);
    setApkReady(false);
    
    const interval = setInterval(() => {
      setCompilePercent(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCompiling(false);
          setApkReady(true);
          // Auto trigger download
          triggerMockDownload();
          return 100;
        }
        return prev + 15;
      });
    }, 200);
  };

  const triggerMockDownload = () => {
    // Generate a simulated APK file download
    const dummyContent = "Rumbo Mobile App Package APK Binaries";
    const blob = new Blob([dummyContent], { type: 'application/vnd.android.package-archive' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rumbo_app_v2.4.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div id="download-app-modal" className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto text-left">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-100 z-10 animate-in zoom-in-95 duration-150">
        
        {/* Closed Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-slate-50 hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-150"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-pine/10 text-pine rounded-full text-[10px] font-bold uppercase tracking-wider mb-2">
            <Tablet className="w-3.5 h-3.5" /> Rumbo Móvil
          </span>
          <h2 className="text-xl md:text-2xl font-display font-bold text-pine">
            Descargar Aplicación Terreno
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Lleva el despacho de pasajeros, el reporte de clima y las fichas de riesgo sin conexión a internet directamente en tu celular.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => setPlatform('android')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              platform === 'android' ? 'bg-white text-pine shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🤖 Android (APK)</span>
          </button>
          <button
            onClick={() => setPlatform('ios')}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              platform === 'ios' ? 'bg-white text-pine shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iOS (iPhone/iPad)</span>
          </button>
        </div>

        {/* ANDROID CONTENT */}
        {platform === 'android' && (
          <div className="space-y-5">
            <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                Compilación Segura Remota
              </h4>
              <p className="text-[11px] text-gray-600 leading-normal mt-1">
                Generamos un paquete APK ligero exclusivo para tu agencia, firmado digitalmente y listo para instalar en cualquier smartphone Android.
              </p>

              {/* Live compiler simulation */}
              {!isCompiling && !apkReady ? (
                <button
                  onClick={triggerApkPackaging}
                  className="mt-4 px-4 py-2 bg-pine hover:bg-pine-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all w-full"
                >
                  <Download className="w-4 h-4 animate-bounce" /> Generar & Descargar APK Android
                </button>
              ) : isCompiling ? (
                <div className="mt-4 bg-white rounded-xl p-3 border border-gray-100">
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1 font-mono">
                    <span>Generando APK (rumbo_app.apk)...</span>
                    <span>{compilePercent}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-pine transition-all duration-300" 
                      style={{ width: `${compilePercent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <div className="bg-white rounded-xl p-3 border border-emerald-200 flex items-center gap-3">
                    <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 font-black" />
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-emerald-800 leading-none">Paquete compilado con éxito</p>
                      <p className="text-[9px] text-gray-400 font-mono mt-1">Archivo: rumbo_app_v2.4.apk (12.8 MB)</p>
                    </div>
                  </div>
                  <button
                    onClick={triggerMockDownload}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" /> Bajar de nuevo (.APK)
                  </button>
                </div>
              )}
            </div>

            {/* Instruction steps */}
            <div className="text-left space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider font-mono">Instrucciones de Instalación:</h4>
              <ul className="text-xs text-gray-600 space-y-2 pl-1">
                <li className="flex gap-2 items-start leading-snug">
                  <span className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Presiona el botón de arriba para compilar y descargar el instalador <strong>.APK</strong>.</span>
                </li>
                <li className="flex gap-2 items-start leading-snug">
                  <span className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Si es tu primera vez, tu teléfono te pedirá activar la opción <strong>"Permitir orígenes desconocidos"</strong> para tu navegador Safari o Chrome.</span>
                </li>
                <li className="flex gap-2 items-start leading-snug">
                  <span className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span>Abre el archivo descargado y presiona <strong>Instalar</strong>. ¡Listo!</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* IOS CONTENT */}
        {platform === 'ios' && (
          <div className="space-y-6">
            <div className="bg-indigo-50/50 border border-indigo-150 rounded-2xl p-4 text-left">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[9px] font-bold uppercase mb-1.5">
                <Apple className="w-3 h-3" /> Compatible con iPhone & iPad
              </span>
              <p className="text-xs text-indigo-900 leading-normal font-medium">
                En iOS, la mejor experiencia nativa se logra añadiendo la app directamente a tu escritorio mediante la función "Agregar a Inicio" de Safari. Esto elimina la barra del navegador, arranca a pantalla completa y habilita el guardado en caché para terreno offline.
              </p>
            </div>

            {/* Steps with indicators */}
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-widest font-mono">Guía Paso a Paso para iOS Safari:</h4>
              
              <div className="space-y-3.5">
                <div className="flex gap-3 items-start border-b border-gray-50 pb-3">
                  <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">Abre Rumbo en Safari</h5>
                    <p className="text-[11px] text-gray-500 mt-0.5">Asegúrate de estar navegando desde <strong>Safari</strong> (el icono de brújula azul oficial de Apple). No uses apps integradas como Gmail o Instagram.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start border-b border-gray-50 pb-3">
                  <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">Toca el botón "Compartir"</h5>
                    <p className="text-[11px] text-gray-500 mt-0.5">Presiona el botón de acción / compartir en el pie de página de Safari (representado por un cuadrado con una flecha apuntando hacia arriba 📤).</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start border-b border-gray-50 pb-3">
                  <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">Selecciona "Agregar al inicio"</h5>
                    <p className="text-[11px] text-gray-500 mt-0.5">Desplázate hacia abajo en el menú de opciones y selecciona la opción <strong>Agregar a Inicio</strong> (o <em>"Add to Home Screen"</em> en inglés con el símbolo ➕).</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-pine text-white flex items-center justify-center text-xs font-bold shrink-0">4</div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-800">¡Acceso directo listo!</h5>
                    <p className="text-[11px] text-gray-500 mt-0.5">Presiona "Agregar" en la esquina superior derecha. El logo de Rumbo aparecerá en la pantalla principal de tu iPhone como si fuera una app nativa descargada de la App Store.</p>
                  </div>
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
