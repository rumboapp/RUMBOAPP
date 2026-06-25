/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';

interface LegalViewProps {
  section: 'terminos' | 'privacidad';
}

const SUPPORT_EMAIL = 'rumboaplicacion@gmail.com';

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
              Bienvenido/a a Rumbo. Estos Términos y Condiciones ("Términos") regulan el acceso y uso de la
              plataforma de software Rumbo ("Rumbo", "la Plataforma", "el Servicio"), accesible en rumboapp.cl,
              operada actualmente por su fundador, persona natural domiciliada en Chile, en su calidad de titular y
              responsable del Servicio mientras no se constituya una sociedad para tales efectos ("el Operador",
              "nosotros").
            </p>
            <p>
              Al crear una cuenta, acceder o utilizar Rumbo, ya sea como administrador de una agencia de turismo,
              como guía vinculado a una agencia registrada, o en cualquier otra calidad, usted declara haber leído,
              entendido y aceptado íntegramente estos Términos, ya sea en su propio nombre o en representación de la
              agencia de turismo a la que pertenece. Si no está de acuerdo con alguna parte de estos Términos, no
              debe utilizar la Plataforma.
            </p>
            <p>
              Si usted acepta estos Términos en representación de una agencia, declara y garantiza que cuenta con
              las facultades suficientes para obligar a dicha agencia a estos Términos, y que la agencia asumirá la
              responsabilidad por el uso que sus administradores y guías hagan de la Plataforma.
            </p>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">1. Definiciones</h2>
              <p>Para efectos de estos Términos, se entenderá por:</p>
              <p>
                <strong>Agencia:</strong> la persona natural o jurídica que opera servicios de turismo, excursiones
                o actividades de turismo aventura, y que se registra en Rumbo para gestionar su operación.
              </p>
              <p>
                <strong>Administrador:</strong> la persona designada por la Agencia con permisos de gestión total
                sobre la cuenta, incluyendo configuración de actividades, guías, planes y facturación.
              </p>
              <p>
                <strong>Guía:</strong> la persona natural vinculada a una Agencia, encargada de conducir o
                supervisar actividades, con acceso limitado a la información necesaria para el desempeño de sus
                funciones dentro de la Plataforma.
              </p>
              <p>
                <strong>Pasajero:</strong> la persona natural que participa o pretende participar en una actividad
                organizada por una Agencia, y cuyos datos son ingresados o gestionados a través de Rumbo por dicha
                Agencia.
              </p>
              <p>
                <strong>Ficha de Riesgo:</strong> el documento digital mediante el cual un Pasajero, o su
                representante legal en caso de tratarse de un menor de edad, declara conocer y aceptar los riesgos
                inherentes a la actividad contratada, y que puede ser firmado digitalmente a través de la
                Plataforma.
              </p>
              <p>
                <strong>Salida o Excursión:</strong> cada instancia programada de una actividad turística
                gestionada a través de Rumbo, con fecha, hora, cupos, guía asignado y estado correspondiente.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">2. Quién puede usar Rumbo</h2>
              <p>
                Rumbo está dirigido exclusivamente a agencias de turismo, sus administradores y sus guías, que
                operen o pretendan operar actividades de turismo, excursiones o turismo aventura dentro del
                territorio de Chile. El uso de la Plataforma para fines distintos a los descritos, o por parte de
                personas o entidades no vinculadas a una actividad de turismo, queda fuera del alcance previsto para
                el Servicio.
              </p>
              <p>
                Cada Agencia es responsable exclusiva de la veracidad, exactitud y legalidad de los datos que
                registra en la Plataforma, incluyendo, sin limitación, la información relativa a sus actividades,
                salidas, guías y pasajeros. Asimismo, cada Agencia declara y garantiza que cuenta con todas las
                autorizaciones, permisos, patentes municipales, seguros y demás requisitos legales y
                administrativos necesarios para operar como prestador de servicios turísticos en Chile, conforme a
                la normativa vigente que le sea aplicable. El Operador de Rumbo no verifica ni se hace responsable
                de constatar el cumplimiento de dichas autorizaciones, siendo esta una obligación exclusiva de cada
                Agencia usuaria.
              </p>
              <p>
                La Agencia es además responsable de la conducta de sus Administradores y Guías dentro de la
                Plataforma, y de que el acceso otorgado a estos se ajuste a sus funciones reales dentro de la
                operación. La promoción de un Guía a rol de Administrador dentro de la Plataforma es una decisión
                exclusiva de la Agencia, y el Operador no interviene ni media en dichas decisiones internas.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">3. Registro de cuenta y uso de credenciales</h2>
              <p>
                Para utilizar Rumbo es necesario crear una cuenta, proporcionando información veraz, completa y
                actualizada. El usuario se compromete a mantener dicha información actualizada en todo momento. La
                Agencia y cada uno de sus usuarios son responsables de mantener la confidencialidad de las
                credenciales de acceso (correo y contraseña, o cualquier otro mecanismo de autenticación
                habilitado), y de toda actividad que ocurra bajo su cuenta.
              </p>
              <p>
                En caso de detectarse o sospecharse un uso no autorizado de una cuenta, o cualquier otra
                vulneración de seguridad, el usuario afectado deberá notificarlo a Rumbo a la brevedad posible a
                través de los canales de contacto publicados en el sitio web. El Operador no será responsable por
                pérdidas o daños derivados del incumplimiento de esta obligación por parte del usuario.
              </p>
              <p>
                El Operador se reserva el derecho de suspender o cancelar cuentas que infrinjan estos Términos, que
                se utilicen con fines fraudulentos, o que pongan en riesgo la seguridad o integridad de la
                Plataforma o de otros usuarios, sin perjuicio de las demás acciones legales que pudieran
                corresponder.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">4. Datos de pasajeros y menores de edad</h2>
              <p>
                La Plataforma permite a las Agencias registrar datos de Pasajeros, incluyendo, en determinados
                casos, datos correspondientes a menores de edad (tales como nombre y edad) cuando estos viajan
                acompañados de un adulto responsable que contrata o participa en la actividad.
              </p>
              <p>La Agencia que ingresa estos datos declara y garantiza expresamente:</p>
              <p>
                a) Contar con el consentimiento informado del adulto responsable del menor para el tratamiento de
                dichos datos dentro de la Plataforma;
              </p>
              <p>
                b) Haber informado a dicho adulto responsable sobre la finalidad del tratamiento de los datos, en
                términos consistentes con lo descrito en la Política de Privacidad de Rumbo;
              </p>
              <p>
                c) Asumir frente al Pasajero, su representante legal, y frente a cualquier autoridad competente,
                toda responsabilidad derivada de la recolección, tratamiento y uso de dichos datos.
              </p>
              <p>
                Rumbo actúa exclusivamente como proveedor de la herramienta tecnológica de almacenamiento y gestión
                de dicha información, conforme a las instrucciones de la Agencia, y no participa en la recolección
                del consentimiento del adulto responsable ni en la determinación de qué datos resulta necesario o
                pertinente recolectar para cada actividad específica. En este sentido, y para efectos de la
                normativa chilena de protección de datos personales, la Agencia actúa como responsable del
                tratamiento de los datos de sus Pasajeros, mientras que Rumbo actúa como encargado o proveedor del
                tratamiento, limitándose a procesar los datos conforme a las instrucciones e información ingresada
                por la propia Agencia.
              </p>
              <p>
                El Operador recomienda a las Agencias revisar periódicamente sus propios procesos internos de
                consentimiento, especialmente en lo relativo a menores de edad, y consultar con asesoría legal
                propia si tienen dudas sobre sus obligaciones específicas como prestadores de servicios turísticos.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">5. Fichas de riesgo y firma digital</h2>
              <p>
                Rumbo permite generar Fichas de Riesgo que el Pasajero, o su representante en caso de menores de
                edad, puede completar y firmar digitalmente a través de un enlace que no requiere creación de
                cuenta, antes de participar en la actividad correspondiente.
              </p>
              <p>
                La firma digital implementada en la Plataforma constituye una manifestación de voluntad electrónica
                del Pasajero respecto del contenido específico de la Ficha de Riesgo al momento de su firma,
                incluyendo, sin limitación, la declaración de datos de salud, alergias, condiciones médicas
                relevantes, experiencia previa en la actividad, y existencia de seguros, según haya sido configurado
                por la respectiva Agencia.
              </p>
              <p>
                La Agencia es la única responsable de definir el contenido de la Ficha de Riesgo correspondiente a
                cada una de sus actividades, y de que dicho contenido refleje de manera correcta, completa y
                actualizada los riesgos reales, inherentes y previsibles de la actividad ofrecida. El Operador no
                redacta, valida, ni asume responsabilidad alguna sobre la suficiencia legal del contenido de las
                Fichas de Riesgo configuradas por cada Agencia, ni sobre su idoneidad para eximir o limitar la
                responsabilidad de la Agencia frente al Pasajero conforme a la legislación chilena aplicable. Se
                recomienda encarecidamente a cada Agencia que revise el contenido de sus Fichas de Riesgo con
                asesoría legal propia, considerando la naturaleza específica de sus actividades.
              </p>
              <p>
                La disponibilidad de la Ficha de Riesgo firmada en el historial de la Agencia dentro de la
                Plataforma no constituye, por sí sola, garantía de validez probatoria en sede judicial o
                administrativa, lo cual dependerá de las circunstancias del caso concreto y de la normativa
                aplicable al momento de su uso.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">6. Widget de clima y suspensión de salidas</h2>
              <p>
                Rumbo integra información climática proporcionada por terceros (actualmente, el servicio
                Open-Meteo u otro proveedor que lo reemplace), con el objeto de facilitar a las Agencias la toma de
                decisiones operativas respecto de sus Salidas programadas, incluyendo alertas visuales ante
                condiciones de tormenta y una funcionalidad de "suspender salida por clima" con notificación
                automática a los Pasajeros inscritos.
              </p>
              <p>
                El Operador no garantiza la exactitud, oportunidad ni disponibilidad continua de la información
                climática proporcionada por dichos terceros, y no asume responsabilidad alguna por errores,
                omisiones o demoras en dicha información. La decisión de suspender, mantener, reprogramar o
                modificar una Salida en virtud de las condiciones climáticas, o de cualquier otra circunstancia, es
                y será siempre una decisión exclusiva y bajo la entera responsabilidad de la Agencia respectiva,
                considerando su propio criterio profesional, experiencia y conocimiento del terreno y la actividad.
                La existencia de esta funcionalidad en la Plataforma no traslada, modifica ni limita en forma alguna
                la responsabilidad que corresponda a la Agencia frente a sus Pasajeros conforme a la legislación
                vigente.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">7. Comunicaciones a pasajeros vía WhatsApp</h2>
              <p>
                Rumbo permite a las Agencias enviar recordatorios, avisos de cancelación y otras comunicaciones a
                sus Pasajeros a través de WhatsApp, mediante plantillas personalizables por actividad. La Agencia es
                responsable de contar con la autorización correspondiente del Pasajero para el envío de dichas
                comunicaciones a su número de contacto, así como del contenido específico de las plantillas que
                configure y envíe. El Operador no es responsable por el contenido de los mensajes enviados por las
                Agencias a través de esta funcionalidad, ni por eventuales interrupciones, limitaciones o cambios en
                las políticas del servicio de mensajería de terceros (WhatsApp/Meta) que puedan afectar la
                disponibilidad de esta funcionalidad.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">8. Membresías, planes y pagos</h2>
              <p>
                Rumbo ofrece distintos planes de suscripción, incluyendo un plan gratuito ("Free") y planes pagos
                ("Premium" y "Pro"), cuyas características, límites y precios vigentes se encuentran publicados en
                el sitio web de la Plataforma y podrán ser actualizados periódicamente por el Operador, dando aviso
                razonable a los usuarios afectados respecto de cambios que impliquen modificaciones de precio para
                suscripciones vigentes.
              </p>
              <p>
                Los planes pagos se cobran de forma recurrente y automática a través de la plataforma de pagos
                Mercado Pago, mediante un sistema de suscripción mensual. Al contratar un plan pago, el usuario
                autoriza expresamente el cobro recurrente correspondiente hasta que dicha suscripción sea cancelada
                conforme a lo dispuesto en estos Términos.
              </p>
              <p>
                El usuario puede cancelar su suscripción en cualquier momento desde el panel de "Planes y
                Suscripción" dentro de la Plataforma. La cancelación detiene los cobros futuros a partir del
                próximo ciclo de facturación, y la Agencia retorna automáticamente al plan Free, conservando sus
                datos históricos sujetos a los límites y funcionalidades propias de dicho plan gratuito. Salvo que
                la normativa aplicable disponga lo contrario, o que se indique expresamente algo distinto al momento
                de la contratación, los pagos ya realizados por períodos de suscripción no son reembolsables de
                forma proporcional al cancelar antes del término del período pagado, manteniéndose el acceso al plan
                contratado hasta el vencimiento de dicho período.
              </p>
              <p>
                Rumbo no almacena ni tiene acceso a los datos completos de tarjetas de crédito, débito u otros
                medios de pago de los usuarios; dicha información es gestionada y procesada directamente por
                Mercado Pago, conforme a sus propias políticas de privacidad y seguridad, las cuales el usuario
                declara conocer y aceptar al utilizar dicho medio de pago.
              </p>
              <p>
                Los precios de los planes están expresados en pesos chilenos (CLP) e incluyen los impuestos
                aplicables conforme a la normativa vigente, salvo que se indique expresamente lo contrario.
              </p>
              <p className="font-semibold text-gray-900 mt-2">8.1 Códigos promocionales y períodos de prueba</p>
              <p>
                El Operador podrá, a su exclusivo criterio, ofrecer códigos promocionales, períodos de prueba
                gratuitos u otros beneficios temporales sobre los planes pagos. Dichos beneficios están sujetos a
                los términos específicos informados al momento de su otorgamiento, pueden estar limitados en el
                tiempo, en el número de usos, o a ciertos tipos de cuentas, y pueden ser modificados o
                discontinuados por el Operador en cualquier momento sin que ello genere derecho a indemnización
                alguna para el usuario, sin perjuicio de respetar los beneficios ya otorgados y en curso al momento
                de la modificación.
              </p>
              <p>
                Salvo que se indique expresamente lo contrario, al término de un período de prueba la cuenta
                retornará automáticamente al plan Free, sin que esto implique un cobro automático no autorizado
                previamente por el usuario.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">9. Propiedad intelectual</h2>
              <p>
                Rumbo, incluyendo, sin limitación, su software, código fuente, diseño, interfaz, marca, logotipos y
                demás elementos distintivos, es de propiedad exclusiva del Operador o de sus licenciantes, y se
                encuentra protegido por la legislación chilena e internacional sobre propiedad intelectual e
                industrial. El uso de la Plataforma no confiere a los usuarios derecho de propiedad alguno sobre el
                software ni sus componentes, sino únicamente una licencia limitada, no exclusiva, revocable e
                intransferible para utilizar el Servicio conforme a estos Términos.
              </p>
              <p>
                Los datos que cada Agencia ingresa a la Plataforma (información de sus actividades, pasajeros,
                guías, etc.) son y seguirán siendo de propiedad de dicha Agencia. El Operador no reivindica derechos
                de propiedad sobre dichos datos, sin perjuicio del tratamiento que se les dé conforme a la Política
                de Privacidad para efectos de la prestación del Servicio.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">10. Usos prohibidos</h2>
              <p>
                El usuario se obliga a no utilizar Rumbo para: (a) actividades ilícitas o que infrinjan derechos de
                terceros; (b) intentar acceder sin autorización a sistemas, cuentas o datos de otras Agencias; (c)
                introducir virus, malware o cualquier código malicioso; (d) realizar ingeniería inversa, descompilar
                o intentar extraer el código fuente de la Plataforma, salvo en los casos expresamente permitidos por
                la ley; (e) suplantar la identidad de terceros o falsear la titularidad de una Agencia; o (f)
                utilizar la información de Pasajeros obtenida a través de la Plataforma para fines distintos a la
                operación legítima de la actividad turística contratada por dichos Pasajeros.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">11. Disponibilidad del servicio y limitación de responsabilidad</h2>
              <p>
                Rumbo se entrega "tal cual" (as-is) y "según disponibilidad" (as-available). El Operador realiza
                esfuerzos razonables, conforme a los estándares propios de una plataforma en etapa de crecimiento,
                para mantener el Servicio disponible, actualizado y con los datos almacenados de forma segura, pero
                no garantiza una disponibilidad ininterrumpida, libre de errores, ni la ausencia total de
                interrupciones por mantenimiento, fallas técnicas, causas de fuerza mayor, o hechos de terceros
                proveedores de infraestructura (tales como, sin limitación, Supabase o Mercado Pago).
              </p>
              <p>
                En la máxima medida permitida por la legislación chilena aplicable, el Operador no será responsable
                por daños indirectos, lucro cesante, pérdida de datos, pérdida de oportunidades de negocio, o
                cualquier otro perjuicio que no derive directamente de un incumplimiento doloso o gravemente
                negligente del Operador en la prestación del Servicio.
              </p>
              <p>
                En particular, y sin que la siguiente enumeración sea taxativa, el Operador no será responsable
                por: (a) decisiones operativas de la Agencia, incluyendo, sin limitación, decisiones sobre
                suspender, mantener o reprogramar una Salida en virtud de condiciones climáticas u otras
                circunstancias; (b) el contenido, suficiencia o validez legal de las Fichas de Riesgo configuradas
                por cada Agencia; (c) accidentes, lesiones o daños sufridos por Pasajeros durante el desarrollo de
                las actividades turísticas operadas por las Agencias; (d) el incumplimiento por parte de las
                Agencias de la normativa sectorial aplicable a la prestación de servicios turísticos en Chile; y (e)
                interrupciones o limitaciones derivadas de servicios de terceros integrados en la Plataforma, tales
                como el proveedor de datos climáticos, el servicio de mensajería WhatsApp/Meta, o la plataforma de
                pagos Mercado Pago.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">12. Indemnidad</h2>
              <p>
                La Agencia se obliga a mantener indemne al Operador frente a cualquier reclamo, demanda, multa o
                perjuicio que terceros (incluyendo Pasajeros, autoridades fiscalizadoras, u otros) pudieran formular
                en su contra como consecuencia del uso que la Agencia, sus Administradores o sus Guías hagan de la
                Plataforma, incluyendo, sin limitación, reclamos derivados de la operación de las actividades
                turísticas, del contenido de las Fichas de Riesgo, o del tratamiento de datos de Pasajeros y menores
                de edad.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">13. Modificaciones a los Términos</h2>
              <p>
                El Operador podrá modificar estos Términos en cualquier momento, publicando la versión actualizada
                en el sitio web de la Plataforma con indicación de su fecha de última actualización. En caso de
                modificaciones sustanciales que afecten significativamente los derechos u obligaciones de los
                usuarios, el Operador procurará notificar dichos cambios a través de los canales de contacto
                disponibles (correo electrónico u otro medio habilitado dentro de la Plataforma) con una antelación
                razonable antes de su entrada en vigencia. El uso continuado de la Plataforma con posterioridad a la
                entrada en vigencia de las modificaciones constituirá aceptación de las mismas.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">14. Legislación aplicable y jurisdicción</h2>
              <p>
                Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia que surja
                con ocasión de estos Términos o del uso de la Plataforma será sometida a los tribunales ordinarios
                de justicia de Chile competentes, sin perjuicio de las normas especiales de protección al
                consumidor que pudieran resultar aplicables conforme a la Ley N° 19.496.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">15. Disposiciones generales</h2>
              <p>
                Si alguna disposición de estos Términos fuere declarada nula, inválida o inexigible por un tribunal
                competente, dicha declaración no afectará la validez de las demás disposiciones, las cuales
                mantendrán plena vigencia. La falta de ejercicio por parte del Operador de algún derecho establecido
                en estos Términos no constituirá una renuncia a dicho derecho, salvo que se exprese de forma
                escrita.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">16. Contacto</h2>
              <p>
                Para consultas, dudas o reclamos relacionados con estos Términos y Condiciones, puede contactarnos
                a través de {SUPPORT_EMAIL} o de los demás canales de contacto publicados en rumboapp.cl.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 text-sm text-gray-700 leading-relaxed">
            <p>
              Esta Política de Privacidad ("Política") describe cómo Rumbo, operado actualmente por su fundador,
              persona natural domiciliada en Chile ("el Operador", "nosotros"), recolecta, utiliza, almacena,
              comparte y protege los datos personales de los administradores de agencia, guías y pasajeros que
              interactúan con la Plataforma, en cumplimiento de la Ley N° 19.628 sobre Protección de la Vida
              Privada y sus modificaciones, incluyendo las introducidas por la Ley N° 21.719 en la medida que
              resulten aplicables y vigentes.
            </p>
            <p>
              Esta Política debe leerse en conjunto con los Términos y Condiciones de Rumbo, especialmente en lo
              relativo a la distinción de roles entre la Agencia (como responsable del tratamiento de los datos de
              sus Pasajeros) y el Operador (como proveedor de la herramienta tecnológica).
            </p>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">1. Qué datos recolectamos</h2>
              <p>Rumbo recolecta las siguientes categorías de datos personales:</p>
              <p>
                <strong>a) Datos de cuenta:</strong> nombre completo, correo electrónico, número de teléfono y,
                opcionalmente, fotografía de perfil de los Administradores y Guías que crean una cuenta en la
                Plataforma.
              </p>
              <p>
                <strong>b) Datos de la agencia:</strong> nombre comercial de la Agencia, ciudad o zona de
                operación, logotipo (en planes que incluyen personalización de marca), y demás información
                operativa relevante para la configuración de la cuenta.
              </p>
              <p>
                <strong>c) Datos operativos:</strong> información relativa a las actividades ofrecidas (nombre,
                descripción, duración, precio, capacidad, punto de encuentro, fotografías), las salidas
                programadas, los guías asignados a cada una, y el estado de dichas salidas.
              </p>
              <p>
                <strong>d) Datos de pasajeros:</strong> nombre, número de teléfono, edad, y, cuando resulte
                pertinente para la actividad contratada, información de salud relevante (tales como alergias,
                condiciones médicas preexistentes, experiencia previa en la actividad y existencia de seguros),
                ingresada directamente por el Pasajero a través del enlace de Ficha de Riesgo, o en algunos casos
                por la propia Agencia.
              </p>
              <p>
                <strong>e) Datos de menores de edad:</strong> en los casos en que un menor de edad participe en una
                actividad acompañado de un adulto responsable, se podrán registrar datos básicos del menor (tales
                como nombre y edad), ingresados por la Agencia o por el adulto responsable a través de la Ficha de
                Riesgo correspondiente.
              </p>
              <p>
                <strong>f) Datos de uso de la plataforma:</strong> información técnica relacionada con el uso de la
                Plataforma, tal como registros de acceso, direcciones IP, y métricas de uso necesarias para el
                funcionamiento y mejora del Servicio.
              </p>
              <p>
                Cabe destacar que los datos de salud descritos en la letra (d) constituyen, conforme a la
                legislación chilena, datos sensibles, y son tratados con especial cuidado conforme a lo descrito en
                la sección 7 de esta Política.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">2. Para qué usamos estos datos</h2>
              <p>Los datos descritos anteriormente se utilizan exclusivamente para las siguientes finalidades:</p>
              <p>
                a) Permitir la operación de la Plataforma, incluyendo la gestión de cuentas, actividades, salidas,
                asignación de guías y administración de reservas;
              </p>
              <p>b) Generar y almacenar las Fichas de Riesgo correspondientes a cada Pasajero, conforme a la actividad contratada;</p>
              <p>
                c) Enviar recordatorios, confirmaciones y avisos de cancelación a los Pasajeros a través de
                WhatsApp, en nombre y bajo instrucción de la Agencia respectiva;
              </p>
              <p>d) Generar reportes, métricas e historiales para uso interno de cada Agencia;</p>
              <p>e) Procesar el cobro de las membresías de suscripción a través de la pasarela de pagos Mercado Pago;</p>
              <p>f) Brindar soporte técnico a los usuarios de la Plataforma;</p>
              <p>g) Cumplir con obligaciones legales aplicables al Operador.</p>
              <p>
                El Operador no vende, arrienda ni comercializa los datos de Pasajeros ni de Agencias a terceros, ni
                los utiliza para fines de publicidad de terceros ajenos al Servicio.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">3. Base de licitud del tratamiento</h2>
              <p>
                El tratamiento de los datos de Administradores y Guías se sustenta en la ejecución del contrato de
                prestación de servicios constituido por los Términos y Condiciones, al momento de crear una cuenta
                en la Plataforma.
              </p>
              <p>
                El tratamiento de los datos de Pasajeros, incluyendo los datos sensibles de salud recolectados a
                través de las Fichas de Riesgo, se sustenta en el consentimiento que dicho Pasajero, o el adulto
                responsable en caso de un menor de edad, otorga directamente al completar y firmar digitalmente la
                Ficha de Riesgo correspondiente, previa información sobre la finalidad de dicho tratamiento. Sin
                perjuicio de lo anterior, es la Agencia, como responsable del tratamiento de los datos de sus
                propios Pasajeros, quien debe asegurar que dicho consentimiento sea recabado de forma adecuada
                conforme a sus propios procesos comerciales y operativos.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">4. Dónde se almacenan los datos y medidas de seguridad</h2>
              <p>
                Los datos recolectados a través de Rumbo se almacenan en infraestructura proporcionada por
                Supabase, utilizada para los servicios de base de datos y autenticación de usuarios de la
                Plataforma. Las imágenes asociadas al Servicio (tales como logotipos de agencia, fotografías de
                actividades y avatares de usuario) se almacenan como parte de dicha infraestructura.
              </p>
              <p>
                Los datos de pago y de suscripción de las Agencias son gestionados directamente por Mercado Pago,
                conforme a sus propias políticas de seguridad y privacidad. El Operador no almacena ni tiene acceso
                a los números completos de tarjetas de crédito o débito de los usuarios.
              </p>
              <p>
                El Operador implementa medidas técnicas y organizativas razonables, conforme a los estándares
                disponibles para una plataforma de su naturaleza y tamaño, para proteger los datos personales
                contra accesos no autorizados, pérdida, alteración o divulgación indebida. No obstante, ningún
                sistema de almacenamiento o transmisión de datos es completamente infalible, por lo que el Operador
                no puede garantizar la seguridad absoluta de la información.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">5. Con quién compartimos los datos</h2>
              <p>
                Los datos personales podrán ser compartidos únicamente con los siguientes terceros, y
                exclusivamente para los fines descritos en esta Política:
              </p>
              <p>a) Supabase, como proveedor de infraestructura de base de datos y autenticación;</p>
              <p>b) Mercado Pago, como proveedor de la pasarela de pagos para el procesamiento de las suscripciones;</p>
              <p>
                c) Meta/WhatsApp, en su calidad de plataforma de mensajería utilizada para el envío de recordatorios
                y avisos a Pasajeros, conforme a las plantillas configuradas por cada Agencia;
              </p>
              <p>
                d) Open-Meteo u otro proveedor de datos climáticos, respecto de la información meteorológica
                mostrada en el panel de la Agencia, sin que esto implique la transferencia de datos personales de
                Pasajeros a dicho proveedor;
              </p>
              <p>
                e) Autoridades públicas competentes, únicamente cuando exista una obligación legal, requerimiento
                judicial o administrativo válido que así lo exija.
              </p>
              <p>
                Cada uno de estos terceros procesa los datos conforme a sus propias políticas de privacidad, las
                cuales recomendamos a los usuarios revisar.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">6. Datos de menores de edad</h2>
              <p>
                Cuando una Agencia registra datos correspondientes a un menor de edad que participa en una
                actividad acompañado de un adulto responsable, dichos datos se utilizan únicamente para fines
                operativos directamente relacionados con la actividad contratada, tales como su identificación
                durante la salida y la elaboración de la Ficha de Riesgo correspondiente, y quedan asociados
                exclusivamente a la cuenta de la Agencia que los ingresó.
              </p>
              <p>
                La Agencia es responsable de contar con el consentimiento del adulto responsable del menor antes de
                registrar dichos datos en la Plataforma, así como de informarle adecuadamente sobre la finalidad de
                dicho tratamiento. El Operador no recolecta directamente datos de menores de edad fuera del contexto
                descrito, y no permite que dichos datos sean utilizados para fines distintos a la operación de la
                actividad turística correspondiente.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">7. Tratamiento de datos sensibles (datos de salud)</h2>
              <p>
                La información de salud que un Pasajero proporciona a través de la Ficha de Riesgo (alergias,
                condiciones médicas, etc.) constituye un dato sensible conforme a la legislación chilena, y es
                tratada por el Operador exclusivamente con el propósito de que la Agencia correspondiente pueda
                evaluar la idoneidad del Pasajero para participar en la actividad y tomar las precauciones
                necesarias durante su desarrollo.
              </p>
              <p>
                Estos datos no se utilizan para ningún otro fin, no se comparten con terceros distintos de la
                propia Agencia que organiza la actividad, y se almacenan con las mismas medidas de seguridad
                aplicables al resto de los datos descritos en esta Política. El acceso a estos datos dentro de la
                Plataforma está limitado a los Administradores y Guías de la Agencia correspondiente que tengan
                asignada la salida respectiva.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">8. Conservación de datos</h2>
              <p>
                El Operador conservará los datos personales mientras la cuenta de la Agencia permanezca activa en
                la Plataforma, y por el tiempo adicional que resulte necesario para el cumplimiento de las
                finalidades descritas en esta Política, o conforme a las obligaciones legales que le sean
                aplicables (tales como, a título ejemplar, obligaciones tributarias o contables).
              </p>
              <p>
                En caso de que una Agencia decida cerrar su cuenta, sus datos y los de sus Pasajeros asociados
                serán eliminados o anonimizados dentro de un plazo razonable no superior a 90 días corridos, salvo
                que exista una obligación legal de conservarlos por un período mayor, o que dichos datos deban
                conservarse para la resolución de un conflicto o reclamo en curso al momento del cierre de la
                cuenta.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">9. Derechos de los titulares de datos</h2>
              <p>
                Conforme a la legislación chilena de protección de datos personales, todo titular de datos
                (Administrador, Guía o Pasajero) tiene derecho a:
              </p>
              <p><strong>a) Acceso:</strong> solicitar información sobre qué datos personales suyos son tratados por la Plataforma;</p>
              <p><strong>b) Rectificación:</strong> solicitar la corrección de datos inexactos o incompletos;</p>
              <p>
                <strong>c) Eliminación o cancelación:</strong> solicitar la eliminación de sus datos personales,
                cuando ello sea procedente conforme a la normativa aplicable;
              </p>
              <p>
                <strong>d) Oposición:</strong> oponerse, en los casos que la ley lo permita, al tratamiento de sus
                datos personales para determinadas finalidades.
              </p>
              <p>
                Los Pasajeros pueden ejercer estos derechos contactando directamente a la Agencia con la que
                reservaron su actividad, dado que dicha Agencia actúa como responsable del tratamiento de sus
                datos, o bien contactando directamente al Operador a través de {SUPPORT_EMAIL}, quien colaborará
                para canalizar la solicitud hacia la Agencia correspondiente cuando sea pertinente.
              </p>
              <p>
                Los Administradores y Guías pueden ejercer estos derechos directamente desde su cuenta o
                contactando al Operador a través del mismo canal.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">10. Transferencias internacionales de datos</h2>
              <p>
                Algunos de los proveedores de infraestructura utilizados por la Plataforma (tales como Supabase)
                podrían almacenar o procesar datos en servidores ubicados fuera de Chile. En tales casos, el
                Operador procurará que dichos proveedores cuenten con medidas de seguridad y protección de datos
                adecuadas y consistentes con los estándares exigidos por la legislación chilena aplicable.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">11. Uso de cookies y tecnologías similares</h2>
              <p>
                La Plataforma podrá utilizar cookies u otras tecnologías similares con fines de autenticación,
                recordatorio de sesión, y mejora de la experiencia de uso. Estas tecnologías no se utilizan con
                fines de publicidad de terceros ajenos al Servicio.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">12. Cambios a esta Política</h2>
              <p>
                El Operador podrá modificar esta Política en cualquier momento, publicando la versión actualizada
                en el sitio web de la Plataforma con indicación de su fecha de última actualización. En caso de
                cambios sustanciales en la forma en que se tratan los datos personales, el Operador procurará
                notificar dichos cambios a través de los canales de contacto disponibles, con una antelación
                razonable a su entrada en vigencia.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-gray-900 mb-1">13. Contacto</h2>
              <p>
                Para ejercer sus derechos como titular de datos personales, o para realizar consultas relacionadas
                con esta Política de Privacidad, puede contactarnos a través de {SUPPORT_EMAIL} o de los demás
                canales de contacto publicados en rumboapp.cl.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
