/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';

interface LegalViewProps {
  section: 'terminos' | 'privacidad';
}

export default function LegalView({ section }: LegalViewProps) {
  const goBack = () => {
    window.location.hash = '#/login';
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col">
      <div className="bg-pine text-white p-4 px-5 flex items-center gap-3">
        <button onClick={goBack} className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:opacity-80">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      </div>
      <div className="max-w-2xl w-full mx-auto p-5 sm:p-8 flex flex-col gap-6">
        <div className="flex gap-3 items-center">
          {section === 'terminos' ? <FileText className="w-6 h-6 text-pine" /> : <ShieldCheck className="w-6 h-6 text-pine" />}
          <h1 className="font-display font-semibold text-2xl text-pine">
            {section === 'terminos' ? 'Términos y Condiciones' : 'Política de Privacidad'}
          </h1>
        </div>
        <p className="text-xs text-gray-400">Última actualización: junio de 2026</p>

        {section === 'terminos' ? (
          <div className="flex flex-col gap-5 text-sm text-gray-700 leading-relaxed">
            <p>
              Estos Términos y Condiciones regulan el uso de Rumbo ("la Plataforma"), un software de gestión para
              agencias de turismo operativas en Chile, accesible en rumboapp.cl. Al crear una cuenta, aceptas estos
              términos en representación de tu agencia o como guía vinculado a una agencia registrada.
            </p>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">1. Quién puede usar Rumbo</h2>
              <p>
                Rumbo está dirigido a agencias de turismo, sus administradores y sus guías. Cada agencia es
                responsable de la veracidad de los datos que registra (actividades, salidas, pasajeros) y de
                contar con las autorizaciones correspondientes para operar como agencia de turismo en Chile.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">2. Datos de pasajeros y menores de edad</h2>
              <p>
                La Plataforma permite registrar datos de pasajeros, incluyendo en algunos casos datos de menores
                de edad (nombre, edad) cuando viajan acompañados de un adulto responsable. La agencia que ingresa
                estos datos declara contar con el consentimiento del adulto responsable para su tratamiento, y es
                la responsable frente al pasajero por el uso correcto de dicha información. Rumbo actúa como
                proveedor de la herramienta de almacenamiento y gestión, no como responsable directo de la
                recolección del consentimiento.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">3. Fichas de riesgo y firma digital</h2>
              <p>
                Las fichas de riesgo firmadas digitalmente a través de Rumbo constituyen una declaración del
                pasajero (o su representante) aceptando los riesgos propios de la actividad contratada. La agencia
                es responsable de que el contenido de la ficha refleje correctamente los riesgos reales de su
                actividad.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">4. Membresías y pagos</h2>
              <p>
                Rumbo ofrece planes pagos (Premium y Pro) que se cobran de forma recurrente a través de Mercado
                Pago mediante un sistema de suscripción. Puedes cancelar tu suscripción en cualquier momento desde
                el panel de "Planes y Suscripción"; la cancelación detiene los cobros futuros y tu agencia vuelve
                al plan Free, conservando tus datos. Rumbo no almacena los datos de tu tarjeta o medio de pago;
                estos son gestionados directamente por Mercado Pago.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">5. Disponibilidad y limitación de responsabilidad</h2>
              <p>
                Rumbo se entrega "tal cual" (as-is). Hacemos esfuerzos razonables para mantener el servicio
                disponible y los datos seguros, pero no garantizamos disponibilidad ininterrumpida. Rumbo no es
                responsable por decisiones operativas de la agencia (por ejemplo, decisiones sobre suspender o no
                una salida por clima), las cuales son siempre responsabilidad de la agencia.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">6. Cuentas y seguridad</h2>
              <p>
                Eres responsable de mantener la confidencialidad de tu contraseña. Notifícanos si detectas un uso
                no autorizado de tu cuenta.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">7. Contacto</h2>
              <p>
                Para consultas sobre estos términos, puedes escribirnos a través de los canales de contacto
                publicados en rumboapp.cl.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 text-sm text-gray-700 leading-relaxed">
            <p>
              Esta Política de Privacidad describe cómo Rumbo recolecta, usa y protege los datos personales de
              administradores de agencia, guías y pasajeros registrados a través de la Plataforma.
            </p>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">1. Qué datos recolectamos</h2>
              <p>
                Datos de cuenta (nombre, correo, teléfono, foto de perfil), datos de la agencia (nombre, ciudad,
                logo), datos operativos (actividades, salidas, guías) y datos de pasajeros (nombre, teléfono, edad,
                información médica o dietaria relevante para la actividad, y en algunos casos datos de menores que
                los acompañan, ingresados por la agencia).
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">2. Para qué usamos estos datos</h2>
              <p>
                Para operar la Plataforma: gestionar reservas y salidas, generar fichas de riesgo, enviar
                recordatorios por WhatsApp, generar reportes a la agencia, y procesar el cobro de membresías a
                través de Mercado Pago. No vendemos datos de pasajeros ni de agencias a terceros.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">3. Dónde se almacenan los datos</h2>
              <p>
                Los datos se almacenan en infraestructura de Supabase (base de datos y autenticación). Las
                imágenes (logos, fotos de actividades, avatares) se almacenan como parte del servicio. Los datos de
                pago y suscripción son gestionados por Mercado Pago; Rumbo no almacena números de tarjeta.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">4. Datos de menores de edad</h2>
              <p>
                Cuando una agencia registra datos de un menor que viaja acompañado, esos datos se usan únicamente
                para fines operativos de la actividad (ej. identificación, ficha de riesgo) y quedan asociados a la
                agencia que los ingresó. La agencia es responsable de contar con el consentimiento del adulto
                responsable antes de registrar esos datos.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">5. Tus derechos</h2>
              <p>
                Puedes solicitar acceso, corrección o eliminación de tus datos personales contactando a la agencia
                con la que reservaste, o directamente a Rumbo a través de los canales de contacto publicados en
                rumboapp.cl.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">6. Conservación de datos</h2>
              <p>
                Conservamos los datos mientras la cuenta de la agencia esté activa. Si una agencia cierra su
                cuenta, sus datos se eliminan o anonimizan dentro de un plazo razonable, salvo obligación legal de
                conservarlos por más tiempo.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
