/**
 * Puyuhuapi Lodge & Spa · Animaciones
 * Excursiones, guías, turnos, huéspedes, implementos, vehículos e informes.
 *
 * Instalación: ver LEEME.md (se pega en Extensiones > Apps Script de una Planilla de Google).
 * Los datos quedan en las hojas de la Planilla: se pueden ver, respaldar o exportar desde ahí.
 */

// Columnas de cada hoja. Se pueden agregar columnas nuevas al final sin romper nada.
const TABLAS = {
  Config:      ['id', 'valor'],
  Guias:       ['id', 'nombre', 'telefono', 'pin', 'color', 'activo', 'notas', 'rol'],
  TiposTurno:  ['id', 'nombre', 'inicio', 'fin', 'color', 'esLibre'],
  Turnos:      ['id', 'fecha', 'guiaId', 'tipoId', 'nota'],
  Actividades: ['id', 'nombre', 'categoria', 'duracion', 'dificultad', 'longitud', 'capacidad', 'recursoId',
                'descripcion', 'incluye', 'implementos', 'checklist', 'color', 'activo'],
  Implementos: ['id', 'nombre', 'cantidad', 'notas'],
  Recursos:    ['id', 'nombre', 'tipo', 'capacidad', 'notas'],
  Huespedes:   ['id', 'nombre', 'habitacion', 'llegada', 'salida', 'pax', 'idioma', 'telefono',
                'restricciones', 'salud', 'tallas', 'notas'],
  Excursiones: ['id', 'fecha', 'inicio', 'fin', 'actividadId', 'guias', 'recursoId', 'pasajeros', 'estado',
                'checklist', 'notas', 'actualizadoPor', 'actualizado']
};

// Hojas que un guía puede editar (el jefe puede editar todo).
const EDITABLE_GUIA = ['Excursiones', 'Huespedes'];
const SESION_DIAS = 30;
const HISTORIAL_DIAS = 730; // cuántos días hacia atrás se cargan en la app (historial e informes)
const CARPETA_INFORMES = 'Informes Puyuhuapi Lodge';

/* ───────────────────────── Web app y menú ───────────────────────── */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(config_('LODGE') || 'Puyuhuapi Lodge & Spa')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Animaciones')
    .addItem('Configurar / reparar hojas', 'configurar')
    .addItem('Ver enlace de la app', 'mostrarEnlace')
    .addToUi();
}

function configurar() {
  const ss = planilla_();
  Object.keys(TABLAS).forEach(hoja_);
  if (!leer_('Config').length) sembrar_();
  migrar_();
  ['Hoja 1', 'Hoja1', 'Sheet1'].forEach(function (n) {
    const h = ss.getSheetByName(n);
    if (h && h.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h);
  });
  aviso_('Listo ✅\n\nLos datos se guardan en la Planilla:\n' + ss.getUrl() +
    '\n\nPIN de ' + jefe_().nombre + ': ' + jefe_().pin +
    '\nPIN de ejemplo de los guías: 1111 y 2222.\nCámbialos dentro de la app (pestaña Guías).\n' +
    'Ahora ve a Implementar > Nueva implementación > App web.');
}

/**
 * Planilla donde viven los datos. Funciona tanto si el script se creó desde una Planilla
 * (Extensiones > Apps Script) como si se creó suelto en script.google.com: en ese caso
 * crea la Planilla "Puyuhuapi Lodge - Datos" en tu Drive la primera vez y la recuerda.
 */
function planilla_() {
  if (planilla_.cache) return planilla_.cache;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PLANILLA_ID');
  let ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) ss = SpreadsheetApp.create('Puyuhuapi Lodge - Datos');
  if (ss.getId() !== id) props.setProperty('PLANILLA_ID', ss.getId());
  planilla_.cache = ss;
  return ss;
}

function mostrarEnlace() {
  const url = ScriptApp.getService().getUrl();
  aviso_(url ? 'Enlace de la app:\n\n' + url : 'Aún no has implementado la app web (Implementar > Nueva implementación).');
}

function aviso_(msg) {
  Logger.log(msg); // se ve en el "Registro de ejecución" del editor
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}

/* ───────────────────────── API usada por la app ───────────────────────── */

function listaAcceso() {
  migrar_();
  return {
    lodge: config_('LODGE') || 'Puyuhuapi Lodge & Spa',
    guias: leer_('Guias').filter(function (g) { return g.activo !== 'no'; })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre); })
      .map(function (g) { return { id: g.id, nombre: g.nombre }; })
  };
}

function login(quien, pin) {
  pin = String(pin || '').trim();
  migrar_();
  if (quien === 'jefe') quien = jefe_().id; // compatibilidad con la versión anterior
  const g = leer_('Guias').filter(function (x) { return x.id === quien && x.activo !== 'no'; })[0];
  if (!g || !g.pin || g.pin !== pin) throw new Error('PIN incorrecto');
  return crearSesion_({ guiaId: g.id });
}

/** El jefe es un guía más, con rol "jefe". Si no existe (instalaciones antiguas), se crea. */
function migrar_() {
  const gs = leer_('Guias');
  const viejo = gs.filter(function (g) { return g.notas === 'Jefe de animaciones'; })[0];
  if (viejo) escribir_('Guias', { id: viejo.id, notas: '' });
  if (gs.some(function (g) { return g.rol === 'jefe'; })) return;
  conLock_(function () {
    escribir_('Guias', { id: 'jefe', nombre: 'Matias Abarca', telefono: '', pin: config_('PIN_JEFE') || '1234',
      color: '#1f5f55', activo: 'si', notas: '', rol: 'jefe' });
  });
}

function jefe_() {
  return leer_('Guias').filter(function (g) { return g.rol === 'jefe'; })[0] || {};
}

function salir(token) {
  PropertiesService.getScriptProperties().deleteProperty('tk_' + token);
}

function cargar(token) {
  const s = sesion_(token);
  const desde = fechaISO_(new Date(Date.now() - HISTORIAL_DIAS * 864e5));
  const d = {};
  Object.keys(TABLAS).forEach(function (t) { d[t] = leer_(t); });
  d.Excursiones = d.Excursiones.filter(function (e) { return !e.fecha || e.fecha >= desde; });
  d.Turnos = d.Turnos.filter(function (e) { return !e.fecha || e.fecha >= desde; });
  d.Huespedes = d.Huespedes.filter(function (h) { return !h.salida || h.salida >= desde; });
  d.Config = d.Config.filter(function (c) { return c.id !== 'PIN_JEFE'; });
  if (s.rol !== 'jefe') d.Guias.forEach(function (g) { delete g.pin; });
  return { me: s, datos: d };
}

function guardar(token, tabla, obj) {
  const s = sesion_(token);
  if (!TABLAS[tabla] || tabla === 'Config') throw new Error('Tabla no válida');
  if (s.rol !== 'jefe' && EDITABLE_GUIA.indexOf(tabla) < 0) throw new Error('No tienes permiso para hacer esto');
  if (tabla === 'Excursiones') {
    obj.actualizadoPor = s.nombre;
    obj.actualizado = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  }
  if (tabla === 'Guias') {
    const otrosJefes = leer_('Guias').filter(function (g) { return g.rol === 'jefe' && g.activo !== 'no' && g.id !== obj.id; });
    if (!otrosJefes.length && (obj.rol !== 'jefe' || obj.activo === 'no')) throw new Error('Debe quedar al menos una persona con permiso de administrador');
  }
  return conLock_(function () {
    const nuevos = tabla === 'Excursiones' ? resolverPasajeros_(obj) : [];
    const res = escribir_(tabla, obj);
    if (nuevos.length) res._nuevosHuespedes = nuevos;
    return res;
  });
}

/**
 * Cada pasajero escrito en una excursión queda en la base de Huéspedes: si ya existe
 * (mismo nombre y habitación) se enlaza; si no, se crea su ficha.
 */
function resolverPasajeros_(obj) {
  let pax = [];
  try { pax = typeof obj.pasajeros === 'string' ? JSON.parse(obj.pasajeros || '[]') : (obj.pasajeros || []); } catch (e) { pax = []; }
  const nuevos = [];
  let hs = null;
  pax.forEach(function (p) {
    const hab = String(p.hab || '').trim();
    if (p.h || !p.nombre) { delete p.hab; return; }
    hs = hs || leer_('Huespedes');
    const n = normal_(p.nombre);
    let h = hs.filter(function (x) { return normal_(x.nombre) === n && (!hab || !x.habitacion || x.habitacion === hab); })[0];
    if (!h) {
      h = escribir_('Huespedes', { id: '', nombre: String(p.nombre).trim(), habitacion: hab, pax: p.pax || 1 });
      hs.push(h); nuevos.push(h);
    } else if (hab && !h.habitacion) {
      h = escribir_('Huespedes', { id: h.id, habitacion: hab });
    }
    p.h = h.id; delete p.nombre; delete p.hab;
  });
  obj.pasajeros = JSON.stringify(pax);
  return nuevos;
}

function normal_(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * PDF de turnos en una hoja horizontal: arma una planilla temporal con colores,
 * la exporta ajustada al ancho de la página y la borra.
 * d = {titulo, subtitulo, cab: [texto | {t, bg}], filas: [[{t, bg, b}]], anchos: [..], alto, pie: [{t, bg, ancho}]}
 * En el pie, cada item va en su propia fila; con ancho=true ocupa todo el ancho.
 */
function pdfTurnos(token, d) {
  sesion_(token);
  const tmp = SpreadsheetApp.create('tmp-turnos');
  try {
    const sh = tmp.getSheets()[0];
    const nc = d.cab.length;
    const valores = [], fondos = [], negritas = [];
    const push = function (fila) {
      const v = [], f = [], b = [];
      for (let i = 0; i < nc; i++) {
        const c = fila[i] || {};
        v.push(String(c.t == null ? '' : c.t)); f.push(c.bg || '#ffffff'); b.push(c.b ? 'bold' : 'normal');
      }
      valores.push(v); fondos.push(f); negritas.push(b);
    };
    push([{ t: d.titulo, b: true }]);
    push([{ t: d.subtitulo }]);
    push(d.cab.map(function (c) { return typeof c === 'string' ? { t: c, bg: '#1f5f55', b: true } : { t: c.t, bg: c.bg || '#1f5f55', b: true }; }));
    d.filas.forEach(push);
    push([]);
    const pie = d.pie || [];
    pie.forEach(function (x) { push([{ t: x.t, bg: x.bg, b: x.b }]); });
    const n = valores.length;
    const rg = sh.getRange(1, 1, n, nc);
    rg.setNumberFormat('@').setValues(valores).setBackgrounds(fondos).setFontWeights(negritas)
      .setFontFamily('Arial').setFontSize(9).setVerticalAlignment('middle').setHorizontalAlignment('center').setWrap(true);
    sh.getRange(1, 1, 1, nc).merge().setFontSize(15).setFontColor('#1f5f55').setHorizontalAlignment('left');
    sh.getRange(2, 1, 1, nc).merge().setFontColor('#63726e').setHorizontalAlignment('left');
    sh.getRange(3, 1, 1, nc).setFontColor('#ffffff');
    sh.getRange(3, 1, d.filas.length + 1, nc).setBorder(true, true, true, true, true, true, '#c9d3cf', SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(4, 1, d.filas.length, 1).setHorizontalAlignment('left');
    pie.forEach(function (x, i) {
      const r = 5 + d.filas.length + i;
      const c = sh.getRange(r, 1, 1, x.ancho ? nc : 1);
      if (x.ancho) c.merge();
      c.setHorizontalAlignment('left').setWrap(false);
    });
    (d.anchos || []).forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    sh.setRowHeight(1, 30);
    for (let r = 4; r < 4 + d.filas.length; r++) sh.setRowHeight(r, d.alto || 34);
    if (sh.getMaxColumns() > nc) sh.deleteColumns(nc + 1, sh.getMaxColumns() - nc);
    if (sh.getMaxRows() > n) sh.deleteRows(n + 1, sh.getMaxRows() - n);
    SpreadsheetApp.flush();
    const url = 'https://docs.google.com/spreadsheets/d/' + tmp.getId() + '/export?format=pdf&size=letter&portrait=false' +
      '&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenum=UNDEFINED&fzr=false' +
      '&top_margin=0.3&bottom_margin=0.3&left_margin=0.3&right_margin=0.3&horizontal_alignment=CENTER&gid=' + sh.getSheetId();
    const nombre = String(d.titulo).replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
    const pdf = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob().setName(nombre);
    return guardarPdf_(pdf, nombre);
  } finally {
    DriveApp.getFileById(tmp.getId()).setTrashed(true);
  }
}

function guardarPdf_(pdf, nombre) {
  const it = DriveApp.getFoldersByName(CARPETA_INFORMES);
  const carpeta = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_INFORMES);
  const f = carpeta.createFile(pdf);
  return { url: f.getUrl(), nombre: nombre, b64: Utilities.base64Encode(pdf.getBytes()) };
}

/** Convierte el informe (HTML) en PDF, lo guarda en Drive y lo devuelve para descargar. */
function generarPdf(token, titulo, html) {
  const s = sesion_(token);
  if (s.rol !== 'jefe') throw new Error('No tienes permiso para hacer esto');
  const nombre = String(titulo || 'Informe').replace(/[\\/:*?"<>|]/g, '-') + '.pdf';
  const pdf = Utilities.newBlob(html, 'text/html', 'informe.html').getAs('application/pdf').setName(nombre);
  return guardarPdf_(pdf, nombre);
}

function eliminar(token, tabla, id) {
  const s = sesion_(token);
  if (s.rol !== 'jefe') throw new Error('No tienes permiso para hacer esto');
  if (!TABLAS[tabla] || tabla === 'Config') throw new Error('Tabla no válida');
  if (tabla === 'Guias' && id === s.guiaId) throw new Error('No puedes eliminar tu propio perfil');
  conLock_(function () {
    const sh = hoja_(tabla);
    const r = filaDe_(sh, id);
    if (r > 0) sh.deleteRow(r);
    if (tabla === 'Guias') { // borra también sus turnos
      const t = hoja_('Turnos');
      leer_('Turnos').filter(function (x) { return x.guiaId === id; }).forEach(function (x) {
        const rr = filaDe_(t, x.id);
        if (rr > 0) t.deleteRow(rr);
      });
    }
  });
  return true;
}

/** Guarda varios turnos de una vez. Cada item: {fecha, guiaId, tipoId, nota}. tipoId vacío = borrar. */
function guardarTurnos(token, lista) {
  const s = sesion_(token);
  if (s.rol !== 'jefe') throw new Error('No tienes permiso para hacer esto');
  return conLock_(function () {
    const sh = hoja_('Turnos');
    const existentes = leer_('Turnos');
    lista.forEach(function (it) {
      const prev = existentes.filter(function (x) { return x.fecha === it.fecha && x.guiaId === it.guiaId; })[0];
      if (!it.tipoId) {
        if (prev) { const r = filaDe_(sh, prev.id); if (r > 0) sh.deleteRow(r); }
      } else {
        const o = escribir_('Turnos', { id: prev ? prev.id : '', fecha: it.fecha, guiaId: it.guiaId, tipoId: it.tipoId, nota: it.nota || '' });
        if (!prev) existentes.push(o);
      }
    });
    const desde = fechaISO_(new Date(Date.now() - HISTORIAL_DIAS * 864e5));
    return leer_('Turnos').filter(function (e) { return !e.fecha || e.fecha >= desde; });
  });
}

function guardarConfig(token, clave, valor) {
  const s = sesion_(token);
  if (s.rol !== 'jefe') throw new Error('No tienes permiso para hacer esto');
  valor = String(valor || '').trim();
  if (clave === 'PIN_JEFE' && valor.length < 4) throw new Error('El PIN debe tener al menos 4 caracteres');
  conLock_(function () { escribir_('Config', { id: clave, valor: valor }); });
  return true;
}

/* ───────────────────────── Sesiones ───────────────────────── */

function crearSesion_(datos) {
  const props = PropertiesService.getScriptProperties();
  const ahora = Date.now();
  const todas = props.getProperties();
  Object.keys(todas).forEach(function (k) { // limpia sesiones vencidas
    if (k.indexOf('tk_') === 0) {
      try { if (JSON.parse(todas[k]).exp < ahora) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
    }
  });
  const token = Utilities.getUuid().replace(/-/g, '');
  props.setProperty('tk_' + token, JSON.stringify({ guiaId: datos.guiaId, exp: ahora + SESION_DIAS * 864e5 }));
  const s = sesion_(token);
  s.token = token;
  return s;
}

/** Rol y nombre se leen siempre desde la hoja Guias, así los cambios aplican de inmediato. */
function sesion_(token) {
  const raw = token && PropertiesService.getScriptProperties().getProperty('tk_' + token);
  if (!raw) throw new Error('SESION');
  const s = JSON.parse(raw);
  if (s.exp < Date.now()) throw new Error('SESION');
  const gid = s.guiaId || (s.rol === 'jefe' ? jefe_().id : '');
  const g = leer_('Guias').filter(function (x) { return x.id === gid; })[0];
  if (!g || g.activo === 'no') throw new Error('SESION');
  return { rol: g.rol === 'jefe' ? 'jefe' : 'guia', guiaId: g.id, nombre: g.nombre };
}

/* ───────────────────────── Acceso a hojas ───────────────────────── */

function hoja_(nombre) {
  const ss = planilla_();
  const cols = TABLAS[nombre];
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, cols.length).setValues([cols])
      .setFontWeight('bold').setBackground('#1f5f55').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    return sh;
  }
  const head = encabezados_(sh);
  const faltan = cols.filter(function (c) { return head.indexOf(c) < 0; });
  if (faltan.length) {
    sh.getRange(1, head.length + 1, 1, faltan.length).setValues([faltan])
      .setFontWeight('bold').setBackground('#1f5f55').setFontColor('#ffffff');
  }
  return sh;
}

function encabezados_(sh) {
  const n = sh.getLastColumn();
  if (!n) return [];
  return sh.getRange(1, 1, 1, n).getDisplayValues()[0];
}

function leer_(nombre) {
  const sh = hoja_(nombre);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const head = encabezados_(sh);
  return sh.getRange(2, 1, n, head.length).getDisplayValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      const o = {};
      head.forEach(function (c, i) { if (c) o[c] = r[i]; });
      return o;
    });
}

function filaDe_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1 || !id) return -1;
  const ids = sh.getRange(2, 1, n, 1).getDisplayValues();
  for (let i = 0; i < n; i++) if (ids[i][0] === String(id)) return i + 2;
  return -1;
}

function escribir_(nombre, obj) {
  const sh = hoja_(nombre);
  const head = encabezados_(sh);
  if (!obj.id) obj.id = nuevoId_();
  let r = filaDe_(sh, obj.id);
  const actual = {};
  if (r > 0) {
    const vals = sh.getRange(r, 1, 1, head.length).getDisplayValues()[0];
    head.forEach(function (c, i) { actual[c] = vals[i]; });
  } else {
    r = sh.getLastRow() + 1;
  }
  const res = {};
  const fila = head.map(function (c) {
    let v = obj.hasOwnProperty(c) ? obj[c] : actual[c];
    if (v === null || v === undefined) v = '';
    if (typeof v === 'object') v = JSON.stringify(v);
    v = String(v);
    res[c] = v;
    return /^[=+]/.test(v) ? "'" + v : v; // evita que se interprete como fórmula
  });
  // Formato texto antes de escribir: así Sheets no convierte fechas u horas.
  sh.getRange(r, 1, 1, head.length).setNumberFormat('@').setValues([fila]);
  return res;
}

function conLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function config_(clave) {
  const c = leer_('Config').filter(function (x) { return x.id === clave; })[0];
  return c ? c.valor : '';
}

function nuevoId_() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fechaISO_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/* ───────────────────────── Datos iniciales ───────────────────────── */

function sembrar_() {
  escribir_('Config', { id: 'PIN_JEFE', valor: '1234' });
  escribir_('Config', { id: 'LODGE', valor: 'Puyuhuapi Lodge & Spa' });

  escribir_('Guias', { id: 'jefe', nombre: 'Matias Abarca', telefono: '', pin: '1234', color: '#1f5f55', activo: 'si',
    notas: '', rol: 'jefe' });
  [['g1', 'Guía 1', '1111', '#2e7d6b'], ['g2', 'Guía 2', '2222', '#c2703d']].forEach(function (g) {
    escribir_('Guias', { id: g[0], nombre: g[1], telefono: '', pin: g[2], color: g[3], activo: 'si', notas: '', rol: '' });
  });

  [['tm', 'Mañana', '08:00', '16:00', '#d7ecff', ''],
   ['tt', 'Tarde', '13:00', '21:00', '#ffe6c7', ''],
   ['tc', 'Completo', '08:00', '20:00', '#e3dcff', ''],
   ['tn', 'Tarde-noche', '16:00', '00:00', '#d4d9e8', ''],
   ['tl', 'Libre', '', '', '#eeeeee', 'si']].forEach(function (t) {
    escribir_('TiposTurno', { id: t[0], nombre: t[1], inicio: t[2], fin: t[3], color: t[4], esLibre: t[5] });
  });

  // Cantidades de referencia: AJÚSTALAS en la pestaña Equipo.
  [['kayak', 'Kayak', 8], ['paddle', 'Tabla paddle', 4], ['remo', 'Remo', 12], ['chaleco', 'Chaleco salvavidas', 16],
   ['faldon', 'Faldón', 8], ['traje', 'Traje de goma', 4], ['bastones', 'Bastones (par)', 10],
   ['botas', 'Botas de agua', 16], ['frontal', 'Linterna frontal', 10], ['capa', 'Capa de lluvia', 16]
  ].forEach(function (i) {
    escribir_('Implementos', { id: i[0], nombre: i[1], cantidad: i[2], notas: '' });
  });

  escribir_('Recursos', { id: 'van', nombre: 'Van', tipo: 'Vehículo', capacidad: '', notas: '' });
  escribir_('Recursos', { id: 'newen', nombre: 'Bote Newen', tipo: 'Bote', capacidad: '', notas: '' });

  const kayak = { kayak: 1, remo: 1, chaleco: 1, faldon: 1 };
  const A = [
    ['Arriendo kayak simple', 'Agua', 60, '', '', '', kayak,
      'Kayak, remo, chaleco, faldón y charla de seguridad. También 30 min.',
      'Charla de seguridad\nRevisar equipo'],
    ['Arriendo paddle surf', 'Agua', 60, '', '', '', { paddle: 1, remo: 1, chaleco: 1, traje: 1 },
      'Paddle, remo, chaleco, traje de goma y charla de seguridad. También 30 min.',
      'Charla de seguridad\nTraje de goma de la talla correcta'],
    ['Trekking Sendero Sur', 'Trekking', 90, 'Baja', '1,5 km', '', { botas: 1 },
      'Guía, charla de seguridad, botas de agua, capa de agua si es necesario y bastones si los requiere.',
      'Botas de agua\nCapas si llueve\nBastones si los piden'],
    ['Trekking Bosque Los Canelos', 'Trekking', 120, 'Baja', '1,8 km', '', { botas: 1, bastones: 1 },
      'Guía, charla de seguridad, botas y bastones. Estación de café con galletas en playa Los Choritos. Fotos.',
      'Estación de café en playa Los Choritos\nGalletas\nCámara / fotos'],
    ['Los Canelos + Kayak', 'Agua', 180, 'Baja', '', '', { kayak: 1, remo: 1, chaleco: 1, faldon: 1, botas: 1 },
      'Guía, briefing de kayak, charla de seguridad y equipo completo. Aperitivo en playa Los Choritos: frutos secos, pisco sour, tabla de quesos de La Junta, mesa y mantel.',
      'Kayaks dejados en playa Los Choritos\nFrutos secos\nPisco sour\nTabla de quesos\nMesa y mantel'],
    ['Kayak guiado por el fiordo', 'Agua', 120, 'Media', '', '', kayak,
      'Guía, briefing de kayak, charla de seguridad, equipo completo y fotos de la experiencia.',
      'Briefing de kayak\nCámara / fotos'],
    ['Kayak nocturno guiado', 'Agua', 120, 'Media', '', '', { kayak: 1, remo: 1, chaleco: 1, frontal: 1 },
      'Guía, briefing nocturno, charla de seguridad y equipo completo (faldón opcional). Cierre con fogón y bebida caliente.',
      'Frontales cargadas\nFogón preparado\nBebida caliente'],
    ['Kayak Isla Pudú', 'Agua', 180, 'Media', '', '', kayak,
      'Guía, briefing de kayak, charla de seguridad, equipo completo, caminata en la isla, picnic y fotos.',
      'Picnic\nCámara / fotos'],
    ['Navegación bote Newen', 'Navegación', 120, 'Baja', '', 'newen', { chaleco: 1 },
      'Guía, briefing de navegación, chalecos salvavidas y una sorpresa regional para degustar. Precio total por bote.',
      'Sorpresa regional\nCombustible del bote\nChalecos'],
    ['Queulat · Laguna Témpanos', 'Queulat', 100, 'Baja', '600 m', 'van', {},
      'Transporte ida y vuelta, guía, entrada al parque, ticket de navegación (opcional, 40 min), termo con café y jarritos.',
      'Entradas al parque\nTickets de navegación\nTermo con café\nJarritos'],
    ['Queulat · Mirador Ventisquero Colgante', 'Queulat', 180, 'Media', '3,3 km', 'van', {},
      'Transporte ida y vuelta, guía, entrada al parque y box lunch.',
      'Entradas al parque\nBox lunch (pedir a cocina)'],
    ['Queulat · Laguna Los Pumas', 'Queulat', 360, 'Media alta', '10 km', 'van', { bastones: 1 },
      'Día completo. Transporte ida y vuelta, guía y box lunch.',
      'Box lunch (pedir a cocina)\nBotiquín\nRadio / comunicación'],
    ['Visita Pueblo Puyuhuapi', 'Pueblos', 180, 'Baja', '', 'van', {},
      'Transporte ida y vuelta, guía y visita a una cafetería típica del pueblo.',
      'Reserva en la cafetería'],
    ['Visita La Junta', 'Pueblos', 180, 'Baja', '', 'van', {},
      'Guía, transporte ida y vuelta, café y pastel, sendero corto con vista al valle.',
      'Reserva en la cafetería']
  ];
  const colores = { Agua: '#2f7fa8', Trekking: '#3f8a4f', 'Navegación': '#2b5d8a', Queulat: '#6b8f3a', Pueblos: '#b0703a' };
  A.forEach(function (a, i) {
    escribir_('Actividades', {
      id: 'a' + (i + 1), nombre: a[0], categoria: a[1], duracion: a[2], dificultad: a[3], longitud: a[4],
      capacidad: '', recursoId: a[5], descripcion: '', incluye: a[7], implementos: a[6], checklist: a[8],
      color: colores[a[1]] || '#1f5f55', activo: 'si'
    });
  });
}
