import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { Passenger, Departure, Activity } from '../types';
import { Compass, CheckCircle, Flame, ShieldAlert, Heart, ClipboardCheck, PhoneCall, AlertCircle, PenTool, RefreshCw } from 'lucide-react';

interface RiskWaiverSignViewProps {
  passengerId: string;
}

export function RiskWaiverSignView({ passengerId }: RiskWaiverSignViewProps) {
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [departure, setDeparture] = useState<Departure | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);

  // Form Fields
  const [dietary, setDietary] = useState('');
  const [medical, setMedical] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  
  // Signature Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasHasDrawing, setCanvasHasDrawing] = useState(false);

  useEffect(() => {
    // Clean and decode the passengerId in case of hash noise
    const cleanId = passengerId.replace(/[^a-zA-Z0-9-]/g, '');
    const currentPax = db.getPassenger(cleanId);
    
    if (currentPax) {
      setPassenger(currentPax);
      setDietary(currentPax.dietary_restrictions || '');
      setMedical(currentPax.medical_issues || '');
      setEmergencyPhone(currentPax.emergency_phone || '');
      
      const dep = db.getDeparture(currentPax.departure_id);
      if (dep) {
        setDeparture(dep);
        const act = db.getActivity(dep.activity_id);
        if (act) {
          setActivity(act);
        }
      }
    }
    setLoading(false);
  }, [passengerId]);

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#111827'; // Dark stone-900 line
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setCanvasHasDrawing(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasHasDrawing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passenger) return;
    if (!canvasHasDrawing) {
      alert('Por favor realiza tu firma en el recuadro indicado.');
      return;
    }

    // Capture signature as Base64 string
    const canvas = canvasRef.current;
    const signatureBase64 = canvas ? canvas.toDataURL('image/png') : '';

    db.updatePassenger(passenger.id, {
      dietary_restrictions: dietary,
      medical_issues: medical,
      emergency_phone: emergencyPhone,
      signed_risk_waiver: true,
      signature_data: signatureBase64,
      signed_at: new Date().toISOString()
    });

    setSigned(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-pine animate-spin mb-2" />
        <p className="text-sm font-medium text-gray-500">Cargando formulario de de exención de responsabilidades...</p>
      </div>
    );
  }

  if (!passenger || !departure || !activity) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-lg font-display font-bold text-gray-950">Ficha Inexistente o Expirada</h2>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          El código de este enlace no coincide con ninguna salida activa de turismo aventura en Rumbo. Por favor, solicita una nueva invitación a tu guía o agencia coordinadora.
        </p>
      </div>
    );
  }

  // Already signed state or successfully submitted
  const isAlreadySigned = passenger.signed_risk_waiver || signed;

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 flex justify-center items-start selection:bg-pine selection:text-white">
      <div className="w-full max-w-xl bg-white border border-gray-150 rounded-3xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
        
        {/* Banner with Logo placeholder */}
        <div className="bg-pine p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-15 transform translate-x-4 -translate-y-4">
            <Compass className="w-40 h-40 animate-spin-slow" />
          </div>
          <div className="relative z-10">
            <div className="bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest py-1 px-3 rounded-full inline-block mb-3.5 border border-white/20">
              Rumbo Aventura • Ficha Digital
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-medium tracking-tight">
              Aceptación de Riesgo y Salud
            </h1>
            <p className="text-xs text-emerald-100/80 mt-1 uppercase font-semibold tracking-wider">
              Actividad: {activity.name}
            </p>
          </div>
        </div>

        {isAlreadySigned ? (
          <div className="p-8 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-display font-bold text-gray-900">¡Ficha de Riesgo Firmada!</h2>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed max-w-sm">
              Muchas gracias, *{passenger.full_name}*. Tu declaración jurada y exención de riesgos ha sido cargada con éxito. Los guías a cargo han sido notificados sobre tu perfil de salud.
            </p>

            <div className="w-full bg-emerald-50/50 rounded-2xl border border-emerald-100 p-4 mt-6 text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-2">
                <ClipboardCheck className="w-3.5 h-3.5" /> Datos del Registro:
              </span>
              <div className="space-y-1.5 text-xs text-gray-700">
                <p>👤 <strong className="text-gray-905">Pasajero:</strong> {passenger.full_name}</p>
                <p>🚢 <strong className="text-gray-905">Excursión:</strong> {activity.name}</p>
                <p>📅 <strong className="text-gray-905">Fecha salida:</strong> {departure.departure_date} • {departure.departure_time}hs</p>
                {passenger.has_minor && passenger.minor_name && (
                  <p>👶 <strong className="text-gray-905">Menor a cargo:</strong> {passenger.minor_name} ({passenger.minor_age} años)</p>
                )}
                {dietary && (
                  <p>🍏 <strong className="text-gray-905">Dietas:</strong> {dietary}</p>
                )}
                {medical && (
                  <p>🩺 <strong className="text-gray-905">Afecciones médicas:</strong> {medical}</p>
                )}
                {emergencyPhone && (
                  <p>📞 <strong className="text-gray-905">Contacto Urgencias:</strong> {emergencyPhone}</p>
                )}
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-6 leading-none">
              Rumbo Operator Security Core • Cumple con Normativa de Exenciones 2026.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col gap-6 text-left">
            {/* Passenger Identification Row */}
            <div className="bg-stone-50 border border-stone-150 rounded-2xl p-4 flex flex-col gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Declarador de Responsabilidad</h3>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-gray-900 block">{passenger.full_name}</span>
                  <span className="text-[10px] text-gray-400 block font-mono">Teléfono: {passenger.phone} ({passenger.pax_count} cupos contratados)</span>
                </div>
                {passenger.has_minor && passenger.minor_name && (
                  <div className="bg-amber-50 text-amber-800 border border-amber-100 rounded-lg p-1.5 px-3.5 text-[10px]">
                    👶 Menor a cargo: <strong className="font-semibold">{passenger.minor_name}</strong> ({passenger.minor_age} años)
                  </div>
                )}
              </div>
            </div>

            {/* Main Liability Text Box */}
            <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50 max-h-56 overflow-y-auto space-y-3 prose text-gray-600 text-xs leading-normal scrollbar-thin">
              <h4 className="font-semibold text-gray-800 uppercase text-[10px] tracking-wide flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" /> Términos y Condiciones Generales
              </h4>
              <p>
                Yo, <strong>{passenger.full_name}</strong>, en nombre propio {passenger.has_minor && `y en representación legal de mi menor hijo/cargo ${passenger.minor_name}`}, de forma libre y voluntaria declaro que he sido informado exhaustivamente acerca de la naturaleza, riesgos intrínsecos y medidas preventivas de la actividad deportiva o de turismo aventura denominada <strong>{activity.name}</strong>, provista por el operador.
              </p>
              <p>
                Entiendo que esta actividad al aire libre puede implicar situaciones adversas impredecibles derivadas del terreno natural, corrientes hídricas, factores meteorológicos repentinos, fatiga física u otras circunstancias de fuerza mayor. 
              </p>
              <p>
                Por consiguiente, asumo plenamente los riesgos concomitantes de la práctica de dicha aventura. Declaro estar en condiciones psicofísicas idóneas y me comprometo a obedecer irrestrictamente las órdenes dadas por los Guías Asignados para salvaguardar mi integridad física y la del grupo.
              </p>
              <p>
                Asimismo, libero de responsabilidad por accidentes fortuitos al transportista terrestre, marítimo, guías independientes o a la propia agencia proveedora, en tanto se actúe bajo las normas de homologación y seguridad previstas para la navegación terrestre y náutica recreativa.
              </p>
            </div>

            {/* Dietary & Medical declaration fields */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-none pb-1 border-b border-gray-100 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" /> Declaración de Salud y Dietas
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Restricciones Alimenticias / Alergias:
                  </label>
                  <input
                    type="text"
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value)}
                    placeholder="Ej: Celíaco, Vegano, Alergia a nueces..."
                    className="w-full border border-gray-250 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                    Lesiones, Medicación o Problemas Médicos:
                  </label>
                  <input
                    type="text"
                    value={medical}
                    onChange={(e) => setMedical(e.target.value)}
                    placeholder="Ej: Asma, Hipertensión, Cirugía de rodilla..."
                    className="w-full border border-gray-250 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-pine/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1 flex items-center gap-1 text-rose-800">
                  <PhoneCall className="w-3.5 h-3.5 text-rose-600" /> Num. de Teléfono de Emergencias (Obligatorio/Familiar):
                </label>
                <input
                  type="text"
                  required
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="Ej: +56 9 1234 5678 (Esposa/Padre)"
                  className="w-full border border-gray-250 rounded-xl px-3 py-2 text-xs bg-white text-gray-800 outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                />
              </div>
            </div>

            {/* Signature Pad Canvas Container */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-pine" /> Firma Digital
              </h4>
              <p className="text-[11px] text-gray-400">
                Usa tu dedo, lápiz digital o el mouse de la computadora para firmar en el recuadro blanco:
              </p>

              <div className="relative border-2 border-dashed border-gray-300 rounded-2xl bg-white overflow-hidden/5 flex items-stretch">
                <canvas
                  ref={canvasRef}
                  width={512}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full bg-stone-50 cursor-crosshair block min-h-[160px] touch-none"
                />
                
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="absolute bottom-2 right-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-black font-semibold text-[10px] rounded-lg px-2.5 py-1.5 shadow-sm border border-gray-200 uppercase transition-all select-none"
                >
                  Limpiar Firma
                </button>
              </div>
            </div>

            {/* Liability Consent Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 bg-sky/30 border border-sky/50 rounded-2xl p-3.5 cursor-pointer text-xs text-gray-700 select-none">
              <input
                type="checkbox"
                required
                className="mt-0.5 rounded border-gray-300 text-pine focus:ring-pine/30"
              />
              <span>
                Certifico bajo juramento que toda la información declarada sobre mi estado de salud y condiciones alimenticias es fidedigna, y acepto los términos de exención de responsabilidades de la actividad.
              </span>
            </label>

            {/* Submit Signature Button */}
            <button
              type="submit"
              className="w-full py-3.5 bg-pine hover:bg-pine-hover text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-300" /> Confirmar y Firmar Exención de Riesgo
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
