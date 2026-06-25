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
  if (clean.startsWith('0')) {
    // If starting with local Argentinian 09 prefix or similar, clean it up
    return '549' + clean.slice(1);
  }
  if (!clean.startsWith('+') && clean.length === 10) {
    // Treat as Argentinian local mobile code
    return '549' + clean;
  }
  return clean.replace('+', '');
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
