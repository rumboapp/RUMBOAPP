# Cotizador Cascadas Hotel — v2

Webapp de Google Apps Script vinculada a la planilla "Base de Datos - Cotizador Cascadas".

## Qué cambió respecto a la versión anterior

- **El PDF ya no se genera con la plantilla de Google Docs.** Ahora se arma en el
  navegador con el formato exacto del documento manual de Word y se descarga al
  instante. La constante `ID_PLANTILLA` ya no existe (el documento de Docs puede
  quedar guardado, pero no se usa).
- **Una sola tabla, transparente**, con bordes finos negros, igual a la del Word.
  Subtotal, IVA 19% y Total van dentro de la misma tabla, sin cuadros vacíos
  contorneados al costado.
- **PDF de una sola hoja larga** (no se corta en páginas A4).
- **"Habitación Matrimonial o Doble" → "Habitación Matrimonial"** (el nombre sale
  de la hoja `Tarifas`, que ya dice "Habitación Matrimonial (2 personas)").
- La vista previa en pantalla es exactamente lo que sale en el PDF.
- Se mantiene: registro en la hoja `Historial` y copia del PDF en la carpeta de
  Drive "Cotizaciones Temporales" (se crea sola si no existe).

## Cómo instalarlo (5 minutos)

1. Abre el proyecto **COTIZADOR** en Apps Script (script.google.com).
2. Abre `Code.gs`, selecciona todo y pégale encima el contenido de
   `cotizador-cascadas/Code.gs` de este repositorio. Guarda (⌘S).
3. Abre `index.html`, selecciona todo y pégale encima el contenido de
   `cotizador-cascadas/index.html`. Guarda.
4. Botón **Deploy → Manage deployments → ícono de lápiz → Version: New version →
   Deploy**. (Si haces "New deployment" en vez de editar, cambia la URL de la app;
   editando la implementación existente, la URL se mantiene.)
5. Abre la URL de la webapp y prueba: nombre, habitación, fechas, botón
   **"Descargar PDF y guardar"**.

## Estructura de la planilla (sin cambios)

- `Tarifas`: Habitacion | PrecioNeto
- `Amenidades`: Amenidad | PrecioNeto
- `Programas`: NombrePrograma | PrecioTotalNeto | TicksJSON
- `TicksJSON`: nombre de programa | JSON (respaldo si la columna de Programas está vacía)
- `Historial`: Fecha | Cliente | Tipo | Detalle | CheckIn | CheckOut | Noches | Neto | Total
