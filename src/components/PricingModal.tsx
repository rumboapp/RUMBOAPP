import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from '../lib/notification-context';
import { Check, Sparkles, HelpCircle, X, CreditCard, ExternalLink, Loader2 } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightedRequiredTier?: 'premium' | 'pro';
}

export function PricingModal({ isOpen, onClose, highlightedRequiredTier }: PricingModalProps) {
  const { agency, user, refreshAgency } = useAuth();
  const { notifyError } = useNotification();
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<'premium' | 'pro' | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!isOpen || !agency) return null;

  const currentPlan = agency.subscription_plan || 'free';

  const PLAN_DETAILS = [
    {
      id: 'free',
      name: 'Plan Gratuito',
      price: '$0',
      period: 'para siempre',
      activitiesLimit: 3,
      guidesLimit: 2,
      features: [
        'Hasta 3 actividades / excursiones',
        'Hasta 2 guías de turismo activos',
        'Métricas limitadas a totales del día',
        'Salidas y reservas de pasajeros ilimitadas',
        'Widget de Clima básico para Puerto Varas',
        'Envío individual de WhatsApps manuales'
      ],
      color: 'border-gray-200 bg-white text-gray-800',
      badgeColor: 'bg-gray-100 text-gray-600',
      actionText: 'Tu Plan Actual'
    },
    {
      id: 'premium',
      name: 'Plan Premium',
      price: '$24.990',
      period: 'mensual',
      activitiesLimit: 10,
      guidesLimit: 20,
      features: [
        'Hasta 10 actividades / excursiones',
        'Hasta 20 guías de turismo en plantel',
        'Filtro avanzado por rango de fechas',
        'Métricas históricas y gráficos de rendimiento',
        'Visualización fluida de pasajeros recurrentes',
        'Soporte prioritario por correo electrónico'
      ],
      color: 'border-pine bg-pine/5 ring-2 ring-pine/20 relative',
      badgeColor: 'bg-pine text-white',
      actionText: 'Subir a Premium',
      popular: true
    },
    {
      id: 'pro',
      name: 'Plan Pro',
      price: '$49.990',
      period: 'mensual',
      activitiesLimit: 50,
      guidesLimit: 100,
      features: [
        'Hasta 50 actividades / excursiones',
        'Hasta 100 guías de turismo con aprobación',
        'Métricas totales y reportes exportables',
        'Exportación masiva a planillas Excel y PDF',
        'Personalización de logotipo e imagen de marca',
        'Soporte prioritario 24/7 y asistencia remota'
      ],
      color: 'border-indigo-150 bg-indigo-50/25 hover:border-indigo-300 transition-colors',
      badgeColor: 'bg-indigo-600 text-white',
      actionText: 'Subir a Pro'
    }
  ];

  const handleStartCheckout = async (planId: 'premium' | 'pro') => {
    if (!supabase || !user?.email) {
      notifyError('No se pudo iniciar el pago. Verifica tu sesión e intenta de nuevo.');
      return;
    }
    setIsRedirecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { agencyId: agency.id, plan: planId, payerEmail: user.email },
      });

      // Si el body trae initPoint, lo usamos sin importar el flag de error:
      // a veces el cliente marca error por detalles de la respuesta aunque el contenido sea válido.
      if (data?.initPoint) {
        window.location.href = data.initPoint;
        return;
      }

      console.error('Error creando la suscripción:', error || data);
      notifyError('No se pudo iniciar el pago. Intenta nuevamente en unos minutos.');
      setIsRedirecting(false);
    } catch (err) {
      console.error('Error inesperado iniciando el checkout:', err);
      notifyError('No se pudo iniciar el pago. Intenta nuevamente en unos minutos.');
      setIsRedirecting(false);
    }
  };

  const handleDowngradeToFree = async () => {
    if (!supabase) return;
    setIsCancelling(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { agencyId: agency.id },
      });
      if (error) {
        console.error('Error cancelando la suscripción:', error);
        notifyError('No se pudo cancelar la suscripción. Intenta nuevamente o contáctanos.');
        setIsCancelling(false);
        return;
      }
      await refreshAgency();
    } catch (err) {
      console.error('Error inesperado cancelando:', err);
      notifyError('No se pudo cancelar la suscripción. Intenta nuevamente o contáctanos.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div id="pricing-subscription-modal" className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto text-left">
      {/* Absolute Backdrop Close click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-stone-50 rounded-3xl p-6 md:p-8 shadow-2xl border border-gray-150 z-10 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        
        {/* Closed Button Header row */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200 hover:scale-105 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* TOP INTRO STYLES */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          {highlightedRequiredTier ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-150 text-xs font-semibold text-amber-800 mb-3 animate-bounce">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Límite de Plan Gratuito alcanzado para esta acción
            </div>
          ) : (
            <span className="text-xs uppercase tracking-wider font-bold text-pine bg-pine/10 px-3 py-1 rounded-full">
              Suscripciones y Membresías
            </span>
          )}
          <h2 className="font-display font-bold text-2xl md:text-3xl text-pine mt-2">
            Escala las capacidades de tu Agencia
          </h2>
          <p className="text-xs sm:text-xs text-gray-500 mt-1 max-w-lg mx-auto">
            Garantiza una operación turística libre de límites. Al subir de nivel podrás agregar más excursiones, colaboradores y acceder a herramientas avanzadas.
          </p>
        </div>

        {/* CHECKOUT OVERLAY */}
        {selectedPlanForCheckout ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 animate-in slide-in-from-bottom duration-200 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 bg-pine/10 text-pine rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-display font-semibold text-lg text-pine mb-1">
              Pagar con Mercado Pago
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-semibold">
              Has seleccionado el{' '}
              <span className="text-pine font-bold uppercase">
                Plan {selectedPlanForCheckout}
              </span>{' '}
              ({PLAN_DETAILS.find((p) => p.id === selectedPlanForCheckout)?.price} CLP/mes)
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={() => setSelectedPlanForCheckout(null)}
                disabled={isRedirecting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-150 text-gray-700 font-semibold rounded-xl text-xs cursor-pointer w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Volver a opciones
              </button>

              <button
                onClick={() => handleStartCheckout(selectedPlanForCheckout)}
                disabled={isRedirecting}
                className="px-5 py-2.5 bg-pine hover:bg-pine-hover text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer w-full sm:w-auto disabled:opacity-70 disabled:cursor-wait"
              >
                {isRedirecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo a Mercado Pago...
                  </>
                ) : (
                  <>
                    Continuar al pago <ExternalLink className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-gray-400 mt-4 leading-normal max-w-xs mx-auto">
              Serás redirigido a la pasarela de pago segura de <strong>Mercado Pago</strong> para completar tu suscripción mensual. Tu cuenta de Rumbo se actualizará automáticamente apenas el pago sea confirmado.
            </p>
          </div>
        ) : (
          <>
            {/* PRICING PLANS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {PLAN_DETAILS.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                const isPopular = plan.popular;

                return (
                  <div
                    key={plan.id}
                    id={`plan-card-${plan.id}`}
                    className={`bg-white rounded-3xl p-6 border flex flex-col justify-between shadow-xs transition-transform duration-200 hover:scale-[1.01] ${plan.color}`}
                  >
                    <div>
                      {/* Popular Banner */}
                      {isPopular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] uppercase tracking-wider font-extrabold bg-pine text-white px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" /> Recomendado
                        </span>
                      )}

                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-display font-bold text-base text-gray-900 capitalize">
                          {plan.name}
                        </h3>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${plan.badgeColor}`}>
                          {plan.activitiesLimit} Act. / {plan.guidesLimit} Guías
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1 my-3">
                        <span className="text-2xl font-bold font-display text-pine">{plan.price}</span>
                        <span className="text-xs text-gray-405">CLP / {plan.period}</span>
                      </div>

                      {/* Quotas visualization slider */}
                      <div className="space-y-4 my-4 pt-3 border-t border-gray-100">
                        <div>
                          <div className="flex justify-between text-[10px] font-semibold text-gray-505 mb-1">
                            <span>Límite de Actividades</span>
                            <span>{plan.activitiesLimit}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${plan.id === 'free' ? 'bg-gray-400' : plan.id === 'premium' ? 'bg-pine' : 'bg-indigo-600'}`} 
                              style={{ width: `${Math.min(100, (plan.activitiesLimit / 50) * 100)}%` }} 
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] font-semibold text-gray-505 mb-1">
                            <span>Límite de Guías</span>
                            <span>{plan.guidesLimit}</span>
                          </div>
                          <div className="h-1.5 bg-gray-105 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${plan.id === 'free' ? 'bg-gray-400' : plan.id === 'premium' ? 'bg-pine' : 'bg-indigo-600'}`} 
                              style={{ width: `${Math.min(100, (plan.guidesLimit / 100) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* FEATURES LIST */}
                      <ul className="text-xs text-gray-600 space-y-2 mb-6 mt-4">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-1.5 leading-snug">
                            <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isCurrent ? 'text-pine' : 'text-emerald-600'}`} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      disabled={isCurrent || isCancelling || isRedirecting}
                      onClick={() => {
                        if (plan.id === 'free') {
                          handleDowngradeToFree();
                        } else {
                          setSelectedPlanForCheckout(plan.id as 'premium' | 'pro');
                        }
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs select-none shadow-sm flex items-center justify-center gap-1 ${
                        isCurrent
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100 border text-center font-bold cursor-default'
                          : plan.id === 'free'
                          ? 'bg-gray-150 hover:bg-gray-200 text-gray-800 cursor-pointer disabled:opacity-60 disabled:cursor-wait'
                          : plan.id === 'premium'
                          ? 'bg-pine text-white hover:bg-pine-hover cursor-pointer'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                      }`}
                    >
                      {isCurrent
                        ? 'Plan Activo'
                        : plan.id === 'free' && isCancelling
                        ? 'Cancelando suscripción...'
                        : plan.id === 'free'
                        ? 'Volver a Plan Gratuito'
                        : currentPlan === 'pro' && plan.id === 'premium'
                        ? 'Bajar a Plan Premium'
                        : plan.actionText}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* SECURITY TRUST BADGES ROW */}
            <div className="bg-emerald-50/50 border border-emerald-100/70 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 text-xs text-emerald-800">
              <div className="w-10 h-10 rounded-full bg-emerald-100/50 flex items-center justify-center text-pine shrink-0 font-bold">
                🔒
              </div>
              <div className="flex-1 text-center sm:text-left">
                <span className="font-bold text-pine block mb-0.5">🔒 Pagos Seguros</span>
                Tus pagos son procesados de forma segura por Mercado Pago. Rumbo nunca almacena los datos de tu tarjeta.
              </div>
            </div>

            {/* DOWNLOAD COMPATIBLE MOBILE APP BAR */}
            <div className="bg-pine/5 border border-pine/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-700 mt-4 leading-normal">
              <div className="text-center sm:text-left">
                <span className="font-bold text-pine block mb-1">📱 ¿Quieres operar en terreno sin conexión WiFi/Celular?</span>
                Instala la App Oficial de Rumbo en tu Android (con instalador rápido .APK) o en tu iPhone en pocos clics.
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new Event('rumbo_open_download'));
                }}
                className="px-4 py-2 bg-pine hover:bg-pine/90 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-3xs"
              >
                Descargar Aplicación Móvil
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
