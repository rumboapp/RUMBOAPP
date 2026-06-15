/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Passenger } from '../types';

/**
 * Generates and triggers the download of a clean CSV spreadsheet with all registered departure passengers
 */
export function exportToCSV(
  passengers: Passenger[],
  activityName: string,
  dateString: string,
  guideName: string
): void {
  // Define metadata headers
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for proper Excel Spanish letter formatting (ñ, á, é...)
  
  csvContent += `Rumbo - Reporte de Pasajeros\n`;
  csvContent += `Actividad:;"${activityName.replace(/"/g, '""')}"\n`;
  csvContent += `Fecha:;"${dateString}"\n`;
  csvContent += `Guia Asignado:;"${guideName}"\n\n`;
  
  // Table headers
  csvContent += `Nombre Completo;Celular / WhatsApp;Cantidad (Pax);Presente / Check-In;Notas / Alergias / Observaciones\n`;
  
  // Populating rows
  passengers.forEach(p => {
    const present = p.checked_in ? "SI" : "NO";
    const cleanNotes = p.notes ? p.notes.replace(/"/g, '""') : '';
    csvContent += `"${p.full_name.replace(/"/g, '""')}";"${p.phone}";${p.pax_count};"${present}";"${cleanNotes}"\n`;
  });
  
  // Create object URL and download
  const encodedUri = encodeURI(csvContent);
  const downloadLink = document.createElement("a");
  
  // Format filename
  const cleanFilename = `pasajeros_${activityName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${dateString}.csv`;
  
  downloadLink.setAttribute("href", encodedUri);
  downloadLink.setAttribute("download", cleanFilename);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/**
 * Operates an elegant, CSS-styled printable window for generating neat PDF dossiers
 */
export function printPDF(
  passengers: Passenger[],
  activityName: string,
  dateString: string,
  guideName: string,
  meetingPoint: string
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Por favor habilita las ventanas emergentes (pop-ups) para ver el PDF imprimible.");
    return;
  }

  const sortedPassengers = [...passengers].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const totalPax = passengers.reduce((sum, p) => sum + p.pax_count, 0);
  const presentPax = passengers.filter(p => p.checked_in).reduce((sum, p) => sum + p.pax_count, 0);

  // Inject styled, ready-to-print HTML structure
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Despacho de Pasajeros: ${activityName} - ${dateString}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1a1a1a;
          margin: 40px;
          line-height: 1.5;
        }
        @media print {
          body { margin: 20px; }
          .no-print { display: none; }
        }
        .header {
          border-bottom: 2px solid #1F4D3A;
          padding-bottom: 15px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 26px;
          font-weight: 800;
          color: #1F4D3A;
          letter-spacing: -0.5px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
          margin-bottom: 25px;
          font-size: 14px;
        }
        .meta-card {
          background: #E8F1F7;
          padding: 12px 16px;
          border-radius: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          font-size: 13px;
        }
        th, td {
          border-bottom: 1px solid #e0e0e0;
          text-align: left;
          padding: 10px 12px;
        }
        th {
          background-color: #1F4D3A;
          color: white;
          font-weight: 600;
        }
        .checkbox-cell {
          width: 30px;
          text-align: center;
        }
        .checkbox-box {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 1px solid #777;
          border-radius: 3px;
        }
        .checked-text {
          color: #1F4D3A;
          font-weight: bold;
        }
        .summary-banner {
          display: flex;
          justify-content: flex-end;
          gap: 40px;
          font-size: 15px;
          font-weight: bold;
          border-top: 2px dashed #ccc;
          padding-top: 15px;
          margin-top: 15px;
        }
        .print-btn {
          background-color: #1F4D3A;
          color: white;
          border: none;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          margin-bottom: 20px;
        }
        .print-btn:hover {
          background-color: #173b2c;
        }
        .footer-note {
          margin-top: 50px;
          font-size: 11px;
          color: #666;
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #666; font-size: 14px;">📄 Vista de impresión generada para Rumbo</span>
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir o Guardar PDF</button>
      </div>

      <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <div class="logo">🧭 Rumbo</div>
          <span style="font-size: 13px; color: #555;">Despacho Oficial de Pasajeros</span>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-card">
          <div style="margin-bottom: 6px;"><strong>Actividad:</strong> ${activityName}</div>
          <div><strong>Punto Encuentro:</strong> ${meetingPoint}</div>
        </div>
        <div class="meta-card" style="background: #f7f7f7;">
          <div style="margin-bottom: 6px;"><strong>Fecha:</strong> ${dateString}</div>
          <div><strong>Guía Responsable:</strong> ${guideName}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="checkbox-cell">Pgo</th>
            <th>Nombre Completo</th>
            <th>Teléfono / WhatsApp</th>
            <th style="text-align: center;">Pasajeros (Pax)</th>
            <th>Notas Especiales / Restricciones</th>
            <th style="width: 100px;">Check-In</th>
          </tr>
        </thead>
        <tbody>
          ${sortedPassengers.map((p, idx) => `
            <tr>
              <td class="checkbox-cell"><div class="checkbox-box"></div></td>
              <td><strong>${p.full_name}</strong></td>
              <td>${p.phone}</td>
              <td style="text-align: center;"><strong>${p.pax_count}</strong></td>
              <td><span style="font-style: italic; color: #555;">${p.notes || '-'}</span></td>
              <td>
                ${p.checked_in 
                  ? '<span class="checked-text">✓ PRESENTE</span>' 
                  : '<span style="color: #999;">☐ AUSENTE</span>'
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-banner">
        <div>Pasajeros Totales (Capacidad): <span style="color: #1F4D3A;">${totalPax}</span></div>
        <div>Check-In Confirmado: <span style="color: #0F6BA8;">${presentPax} / ${totalPax}</span></div>
      </div>

      <div class="footer-note">
        Este documento es para uso exclusivo del guía designado y la administración de la agencia de turismo.<br>
        Rumbo — Sistema de Gestión Inteligente para Operadores de Aventura. Generado el ${new Date().toLocaleDateString('es-AR')}.
      </div>

      <script>
        // Auto-focus and open printer panel for top-tier comfort
        window.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
