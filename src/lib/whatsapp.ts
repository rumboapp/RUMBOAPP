/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Passenger, Departure, Activity } from '../types';

/**
 * Normalizes phone numbers to a standard international format suitable for wa.me links
 */
export function cleanPhoneNumber(phone: string): string {
  // Remove spaces, hyphens, parenthesis and keep only digits and plus sign
  const clean = phone.replace(/[^0-9+]/g, '');
  const digits = clean.replace('+', '');

  // Con "+" explícito se respeta el código de país tal cual
  if (clean.startsWith('+')) return digits;
  // Ya viene con código de país chileno
  if (digits.startsWith('56') && digits.length === 11) return digits;
  // Celular chileno sin código de país: 9XXXXXXXX (9 dígitos)
  if (digits.length === 9 && digits.startsWith('9')) return '56' + digits;
  // Celular chileno sin el 9: XXXXXXXX (8 dígitos)
  if (digits.length === 8) return '569' + digits;
  // Formatos argentinos legacy (0XX / 10 dígitos)
  if (digits.startsWith('0')) return '549' + digits.slice(1);
  if (digits.length === 10) return '549' + digits;
  return digits;
}

/**
 * Prepares the URL to send a single reminder message to a passenger via WhatsApp
 */
export function getPassengerReminderLink(passenger: Passenger, departure: Departure, activity: Activity, customTemplate?: string): string {
  const formattedPhone = cleanPhoneNumber(passenger.phone);
  
  // Format Date (DD/MM)
  let dateStr = departure.departure_date;
  try {
    const parts = departure.departure_date.split('-');
    if (parts.length === 3) {
      dateStr = `${parts[2]}/${parts[1]}`;
    }
  } catch (_) {}

  let text = '';
  if (customTemplate && customTemplate.trim()) {
    text = customTemplate
      .replace(/{pasajero}/gi, passenger.full_name)
      .replace(/{actividad}/gi, activity.name)
      .replace(/{fecha}/gi, dateStr)
      .replace(/{hora}/gi, departure.departure_time)
      .replace(/{punto_encuentro}/gi, activity.meeting_point)
      .replace(/{pasajeros}/gi, String(passenger.pax_count));
  } else {
    text = `Hola *${passenger.full_name}*, te recordamos de tu excursión con *Rumbo*:
  
🚢 *Excursión:* ${activity.name}
📅 *Fecha:* ${dateStr}
⏰ *Hora:* ${departure.departure_time}hs
📍 *Punto de encuentro:* ${activity.meeting_point}${passenger.notes ? `\n📝 *Nota:* ${passenger.notes}` : ''}

¡Recomendamos llegar 15 minutos antes! Ante cualquier duda puedes responder a este mensaje.`;
  }

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Prepares the URL to ask a passenger to sign their risk waiver via WhatsApp
 */
export function getRiskWaiverSignLink(passenger: Passenger, signUrl: string): string {
  const formattedPhone = cleanPhoneNumber(passenger.phone);

  const text = `Hola *${passenger.full_name}*, te escribimos de *Rumbo* para pedirte que completes la firma de la ficha de riesgo antes de tu excursión.

📝 Por favor ingresa al siguiente enlace para firmarla:
${signUrl}

¡Muchas gracias!`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Prepares the URL to confirm a public booking request via WhatsApp,
 * including the agency's payment info (link or transfer details).
 */
export function getBookingConfirmationLink(
  fullName: string,
  phone: string,
  activityName: string,
  departureDate: string,
  departureTime: string,
  agencyName: string,
  paymentInfo?: string
): string {
  const formattedPhone = cleanPhoneNumber(phone);

  let dateStr = departureDate;
  try {
    const parts = departureDate.split('-');
    if (parts.length === 3) dateStr = `${parts[2]}/${parts[1]}`;
  } catch (_) {}

  const paymentBlock = paymentInfo && paymentInfo.trim()
    ? `\n💳 *Para confirmar tu cupo, realiza el pago aquí:*\n${paymentInfo.trim()}\n\nUna vez realizado el pago, respóndenos con el comprobante.`
    : '\nEn breve te enviaremos las instrucciones de pago para confirmar tu cupo.';

  const text = `Hola *${fullName}*, te escribimos de *${agencyName}* 🌄

¡Buenas noticias! Aceptamos tu solicitud de reserva:

🚢 *Excursión:* ${activityName}
📅 *Fecha:* ${dateStr}
⏰ *Hora:* ${departureTime}hs
${paymentBlock}

*Importante:* tu reserva queda confirmada solo una vez realizado el pago. Luego te pediremos completar tu ficha de seguridad. ¡Gracias!`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Prepares the URL to notify a passenger about rescheduling or cancellation due to heavy rain/storms
 */
export function getPassengerCancellationLink(passenger: Passenger, departure: Departure, activity: Activity): string {
  const formattedPhone = cleanPhoneNumber(passenger.phone);

  let dateStr = departure.departure_date;
  try {
    const parts = departure.departure_date.split('-');
    if (parts.length === 3) {
      dateStr = `${parts[2]}/${parts[1]}`;
    }
  } catch (_) {}

  const text = `⚠️ *Alerta de Suspensión - Rumbo* ⚠️

Hola *${passenger.full_name}*, nos comunicamos de la agencia para informarte que debido a *alertas climáticas desfavorables*, lamentamos avisar que hemos *SUSPENDIDO* la salida de *${activity.name}* programada para el día *${dateStr}* a las *${departure.departure_time}hs*.

Queremos coordinar una reprogramación de fecha o gestionar el reembolso correspondiente. 

Por favor, respóndenos por este medio para coordinar la mejor opción. ¡Muchas gracias y disculpas por el inconveniente!`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
}
