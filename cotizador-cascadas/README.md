# Cotizador Cascadas Hotel — arreglo del cuadro del PDF

Estos son los archivos del proyecto de Apps Script "COTIZADOR", basados en la
versión original completa del usuario, con **un solo cambio funcional**: el
botón **GENERAR PDF** ahora produce el documento con el formato del Word manual.

## Qué cambió (y qué no)

Cambió:
- **GENERAR PDF**: el PDF se arma en el navegador (jsPDF + html2canvas, las
  mismas librerías que ya usaba el módulo de Reportes) con:
  - **Una sola tabla transparente** con bordes finos negros, igual a la del
    Word manual. Subtotal, IVA 19% y Total van dentro de la misma tabla y las
    celdas vacías a su izquierda no tienen borde (adiós cuadros contorneados).
  - **Una sola hoja larga**, sin cortes de página.
  - Los **textos siguen saliendo de la plantilla de Google Docs** (vía
    `obtenerElementosPlantilla`), así que la pestaña "Editar Plantilla" sigue
    afectando al PDF.
  - El PDF se descarga al instante y además se respalda en la carpeta
    "Cotizaciones Temporales" de Drive y se registra en `Historial`
    (nueva función `guardarPdfClienteYRegistrar` en Code.gs).
- La lista base de tarifas dice "Habitación Matrimonial" (sin "o Doble").
  Nota: esa lista solo se usa si la hoja `Tarifas` está vacía; los nombres
  reales siempre salen de la hoja.

NO cambió (todo el resto es idéntico al original):
- Pestañas Estándar / Programas / Configurar Tarifas / Editar Plantilla
- Amenidades predefinidas y adicionales manuales
- Guardar/eliminar programas, coberturas, ocasiones especiales
- Panel de Reportes completo con exportación a PDF
- Registro en Historial
- **GENERAR WORD**: mantiene el flujo original con la plantilla de Google Docs
  (ese documento conserva el estilo anterior de tabla).

## Cómo instalar

1. Abre el proyecto **COTIZADOR** en script.google.com.
2. En `Code.gs`: seleccionar todo → pegar encima el `Code.gs` de esta carpeta → guardar.
3. En `index.html`: seleccionar todo → pegar encima el `index.html` de esta carpeta → guardar.
4. **Deploy → Manage deployments → lápiz → Version: New version → Deploy**
   (editar la implementación existente mantiene la misma URL).
5. Probar: nombre + fechas + habitación → **GENERAR PDF**.
