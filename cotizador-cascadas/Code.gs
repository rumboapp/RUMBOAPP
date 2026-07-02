// =================================================================
// CONFIGURACIÓN DE IDS GLOBALES
// =================================================================
const ID_PLANILLA_SHEETS = "164qlshfA21LK2hIAcVlrv8rdNIamupZfF5_gSTW6zWo";
const NOMBRE_CARPETA_COTIZACIONES = "Cotizaciones Temporales";

// NOTA: Ya no se necesita ID_PLANTILLA (el documento de Google Docs).
// El PDF ahora se genera directamente en el navegador con el formato
// exacto del documento manual de Word, en una sola hoja larga.

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Cotizador - Cascadas Hotel')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// =================================================================
// CONFIGURACIÓN: lee Tarifas, Amenidades y Programas desde la planilla
// =================================================================
function obtenerConfiguracion() {
  try {
    var ss = SpreadsheetApp.openById(ID_PLANILLA_SHEETS);

    // ---- Tarifas (habitaciones) ----
    var sheetTarifas = ss.getSheetByName("Tarifas") || ss.insertSheet("Tarifas");
    var dataTarifas = sheetTarifas.getDataRange().getValues();
    if (dataTarifas.length <= 1) {
      var base = [
        ["Habitación Single (1 persona)", 100000],
        ["Habitación Suite (2 personas)", 150000],
        ["Cama Adicional (de campaña rollaway)", 50000],
        ["Habitación Matrimonial (2 personas)", 100000],
        ["Habitación Twin (2 personas)", 100000]
      ];
      sheetTarifas.getRange(1, 1, 1, 2).setValues([["Habitacion", "PrecioNeto"]]);
      sheetTarifas.getRange(2, 1, base.length, 2).setValues(base);
      dataTarifas = sheetTarifas.getDataRange().getValues();
    }
    var tarifas = [];
    for (var i = 1; i < dataTarifas.length; i++) {
      if (dataTarifas[i][0] && dataTarifas[i][1] !== "" && dataTarifas[i][1] !== null) {
        tarifas.push({
          nombre: String(dataTarifas[i][0]).trim(),
          precio: Number(dataTarifas[i][1])
        });
      }
    }

    // ---- Amenidades ----
    var sheetAmen = ss.getSheetByName("Amenidades") || ss.insertSheet("Amenidades");
    var dataAmen = sheetAmen.getDataRange().getValues();
    if (dataAmen.length <= 1) {
      var baseAmen = [
        ["Early Check In", 25000],
        ["Late Check Out", 25000],
        ["Sesión de Tinaja", 50000],
        ["Almuerzo Sugerencia del Chef", 30000],
        ["Cena Sugerencia del Chef", 30000],
        ["Welcome Drink", 10000],
        ["Masaje de Relajación", 55000]
      ];
      sheetAmen.getRange(1, 1, 1, 2).setValues([["Amenidad", "PrecioNeto"]]);
      sheetAmen.getRange(2, 1, baseAmen.length, 2).setValues(baseAmen);
      dataAmen = sheetAmen.getDataRange().getValues();
    }
    var amenidades = [];
    for (var j = 1; j < dataAmen.length; j++) {
      if (dataAmen[j][0] && dataAmen[j][1] !== "" && dataAmen[j][1] !== null) {
        amenidades.push({
          nombre: String(dataAmen[j][0]).trim(),
          precio: Number(dataAmen[j][1])
        });
      }
    }

    // ---- Programas (con TicksJSON) ----
    var programas = [];
    var sheetProg = ss.getSheetByName("Programas");
    var ticksPorNombre = {};
    var sheetTicks = ss.getSheetByName("TicksJSON");
    if (sheetTicks) {
      var dataTicks = sheetTicks.getDataRange().getValues();
      for (var t = 0; t < dataTicks.length; t++) {
        var nom = String(dataTicks[t][0] || "").trim();
        var json = String(dataTicks[t][1] || "").trim();
        if (nom && json) ticksPorNombre[nom.toUpperCase()] = json; // la última fila gana
      }
    }
    if (sheetProg) {
      var dataProg = sheetProg.getDataRange().getValues();
      for (var k = 1; k < dataProg.length; k++) {
        var nombreProg = String(dataProg[k][0] || "").trim();
        if (!nombreProg || dataProg[k][1] === "" || dataProg[k][1] === null) continue;
        var ticksRaw = String(dataProg[k][2] || "").trim() || ticksPorNombre[nombreProg.toUpperCase()] || "";
        var ticks = null;
        if (ticksRaw) {
          try { ticks = JSON.parse(ticksRaw); } catch (e) { ticks = null; }
        }
        programas.push({
          nombre: nombreProg,
          precio: Number(dataProg[k][1]),
          ticks: ticks
        });
      }
    }

    return { ok: true, tarifas: tarifas, amenidades: amenidades, programas: programas };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// =================================================================
// GUARDAR: registra la cotización en Historial y guarda el PDF en Drive
// payload = {
//   cliente: "Nombre",
//   tipo: "Estándar" | "Programa",
//   lineas: [{detalle, checkIn, checkOut, noches, neto, total}, ...],
//   nombreArchivo: "Cotizacion_....pdf",
//   pdfBase64: "JVBERi0..." (PDF en base64, sin prefijo data:)
// }
// =================================================================
function guardarCotizacion(payload) {
  try {
    var ss = SpreadsheetApp.openById(ID_PLANILLA_SHEETS);

    // ---- Historial ----
    var sheetHist = ss.getSheetByName("Historial") || ss.insertSheet("Historial");
    if (sheetHist.getLastRow() === 0) {
      sheetHist.appendRow(["Fecha", "Cliente", "Tipo", "Detalle", "CheckIn", "CheckOut", "Noches", "Neto", "Total"]);
    }
    var ahora = new Date();
    (payload.lineas || []).forEach(function (l) {
      sheetHist.appendRow([
        ahora,
        payload.cliente || "",
        payload.tipo || "",
        l.detalle || "",
        l.checkIn || "",
        l.checkOut || "",
        l.noches,
        l.neto,
        l.total
      ]);
    });

    // ---- PDF en Drive ----
    var url = "";
    if (payload.pdfBase64) {
      var carpetas = DriveApp.getFoldersByName(NOMBRE_CARPETA_COTIZACIONES);
      var carpeta = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder(NOMBRE_CARPETA_COTIZACIONES);
      var blob = Utilities.newBlob(
        Utilities.base64Decode(payload.pdfBase64),
        "application/pdf",
        payload.nombreArchivo || ("Cotizacion_Cascadas_" + ahora.getTime() + ".pdf")
      );
      var archivo = carpeta.createFile(blob);
      url = archivo.getUrl();
    }

    return { ok: true, url: url };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
