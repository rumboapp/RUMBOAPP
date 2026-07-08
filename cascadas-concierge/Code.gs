/**
 * ============================================================================
 * CASCADAS CONCIERGE — ACTO 2: BACKEND (Code.gs)
 * ============================================================================
 * Backend, APIs, logica de negocio, seguridad y validaciones server-side.
 *
 * Todas las funciones expuestas al frontend validan permisos y datos en el
 * servidor. Nada de horarios/capacidades/precios esta hardcodeado: todo se
 * lee de las hojas Configuracion y Servicios.
 *
 * El ID del Spreadsheet se guarda en ScriptProperties por Setup.gs.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// CONSTANTES DE NOMBRES DE HOJAS (unica fuente de verdad)
// ---------------------------------------------------------------------------
var HOJAS = {
  CONFIGURACION: 'Configuracion',
  HABITACIONES: 'Habitaciones',
  SERVICIOS: 'Servicios',
  CATEGORIAS: 'CategoriasProducto',
  PRODUCTOS: 'Productos',
  RESERVAS: 'Reservas',
  PEDIDOS: 'Pedidos',
  DETALLE_PEDIDOS: 'DetallePedidos',
  USUARIOS: 'Usuarios',
  EVENTOS_BLOQUEOS: 'EventosBloqueos',
  NOTIFICACIONES: 'Notificaciones',
  DISPONIBILIDAD_PERSONAL: 'DisponibilidadPersonal',
  LOG: 'LogActividad',
  HISTORIAL: 'HistorialPedidos'
};

// Estados permitidos del sistema (unica fuente de verdad).
var ESTADOS = {
  DISPONIBLE: 'Disponible',
  SOLICITADA: 'Solicitada',
  PENDIENTE: 'Pendiente aprobacion',
  CONFIRMADA: 'Confirmada',
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
  CANCELADA_HUESPED: 'Cancelada huesped',
  CANCELADA_HOTEL: 'Cancelada hotel',
  BLOQUEADA: 'Bloqueada',
  NO_ASISTIO: 'No asistio'
};

// ===========================================================================
// 6.1. FUNCIONES DE RENDERIZADO
// ===========================================================================

/**
 * Punto de entrada web. Si viene ?hab=XXX renderiza vista huesped inyectando
 * la habitacion validada. Si no, renderiza el selector de rol/acceso.
 * @param {Object} e Evento de peticion GET.
 * @return {HtmlOutput}
 */
function doGet(e) {
  var plantilla = HtmlService.createTemplateFromFile('Index');

  // Valor por defecto: sin habitacion (mostrara selector de acceso).
  plantilla.HABITACION_QR = '';

  if (e && e.parameter && e.parameter.hab) {
    var numero = String(e.parameter.hab).trim();
    // Validacion server-side: la habitacion debe existir.
    if (_habitacionExiste(numero)) {
      plantilla.HABITACION_QR = numero;
    }
  }

  return plantilla.evaluate()
    .setTitle(_obtenerConfigValor('HOTEL_NOMBRE') || 'Cascadas Concierge')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper para incluir archivos HTML parciales (si se usaran).
 * @param {string} filename
 * @return {string} Contenido evaluado.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ===========================================================================
// UTILIDADES INTERNAS DE ACCESO A HOJAS
// ===========================================================================

/** Devuelve el Spreadsheet activo segun el ID guardado por Setup.gs. */
function _ss() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) {
    throw new Error('No se encontro SPREADSHEET_ID. Ejecuta crearBaseDeDatos() primero.');
  }
  return SpreadsheetApp.openById(id);
}

/** Devuelve una hoja por nombre. */
function _hoja(nombre) {
  var hoja = _ss().getSheetByName(nombre);
  if (!hoja) throw new Error('Hoja no encontrada: ' + nombre);
  return hoja;
}

/**
 * Lee una hoja completa como array de objetos {columna: valor}.
 * @param {string} nombreHoja
 * @return {Array<Object>}
 */
function _leerHojaComoObjetos(nombreHoja) {
  var hoja = _hoja(nombreHoja);
  var datos = hoja.getDataRange().getValues();
  if (datos.length < 2) return [];
  var encabezados = datos[0];
  var objetos = [];
  for (var i = 1; i < datos.length; i++) {
    var obj = {};
    for (var c = 0; c < encabezados.length; c++) {
      obj[encabezados[c]] = datos[i][c];
    }
    obj._fila = i + 1; // numero de fila real en la hoja (1-indexed)
    objetos.push(obj);
  }
  return objetos;
}

/** Convierte un valor de celda a booleano real (soporta "TRUE"/true/1). */
function _aBooleano(valor) {
  if (valor === true) return true;
  if (typeof valor === 'string') return valor.toUpperCase() === 'TRUE';
  if (typeof valor === 'number') return valor === 1;
  return false;
}

/** Devuelve el indice (0-based) de una columna por su encabezado. */
function _indiceColumna(hoja, nombreColumna) {
  var encabezados = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  return encabezados.indexOf(nombreColumna);
}

// ===========================================================================
// 6.2. FUNCIONES DE DATOS
// ===========================================================================

/**
 * Devuelve toda la configuracion como objeto {clave: valor}.
 * @return {Object}
 */
function obtenerConfiguracionCompleta() {
  var filas = _leerHojaComoObjetos(HOJAS.CONFIGURACION);
  var config = {};
  filas.forEach(function (f) {
    config[f.Clave] = f.Valor;
  });
  return config;
}

/** Helper interno: valor de una clave de configuracion. */
function _obtenerConfigValor(clave) {
  var filas = _leerHojaComoObjetos(HOJAS.CONFIGURACION);
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].Clave === clave) return filas[i].Valor;
  }
  return null;
}

/**
 * Devuelve los servicios activos (Activo=TRUE).
 * @return {Array<Object>}
 */
function obtenerServiciosActivos() {
  return _leerHojaComoObjetos(HOJAS.SERVICIOS).filter(function (s) {
    return _aBooleano(s.Activo);
  }).map(_normalizarServicio);
}

/** Normaliza un servicio a tipos utiles para el frontend. */
function _normalizarServicio(s) {
  return {
    ID: s.ID,
    Nombre: s.Nombre,
    Categoria: s.Categoria,
    DuracionMinutos: Number(s.DuracionMinutos) || 0,
    Capacidad: Number(s.Capacidad) || 0,
    CostoBase: Number(s.CostoBase) || 0,
    RequiereAprobacion: _aBooleano(s.RequiereAprobacion),
    Activo: _aBooleano(s.Activo),
    HorarioInicio: s.HorarioInicio,
    HorarioFin: s.HorarioFin,
    Descripcion: s.Descripcion,
    PermitePrepedido: _aBooleano(s.PermitePrepedido),
    EsIncluible: _aBooleano(s.EsIncluible)
  };
}

/** Devuelve un servicio normalizado por ID (o null). */
function _obtenerServicio(servicioID) {
  var filas = _leerHojaComoObjetos(HOJAS.SERVICIOS);
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].ID === servicioID) return _normalizarServicio(filas[i]);
  }
  return null;
}

/**
 * Devuelve todas las habitaciones.
 * @return {Array<Object>}
 */
function obtenerHabitaciones() {
  return _leerHojaComoObjetos(HOJAS.HABITACIONES).map(function (h) {
    return {
      Numero: String(h.Numero),
      Estado: h.Estado,
      Tipo: h.Tipo,
      Capacidad: Number(h.Capacidad) || 0,
      Notas: h.Notas
    };
  });
}

/** Comprueba si una habitacion existe. */
function _habitacionExiste(numero) {
  var habs = _leerHojaComoObjetos(HOJAS.HABITACIONES);
  for (var i = 0; i < habs.length; i++) {
    if (String(habs[i].Numero) === String(numero)) return true;
  }
  return false;
}

/**
 * Devuelve las categorias de menu visibles, ordenadas.
 * @return {Array<Object>}
 */
function obtenerCategoriasMenu() {
  return _leerHojaComoObjetos(HOJAS.CATEGORIAS)
    .filter(function (c) { return _aBooleano(c.Visible); })
    .map(_normalizarCategoria)
    .sort(function (a, b) { return a.Orden - b.Orden; });
}

/** Normaliza una categoria. */
function _normalizarCategoria(c) {
  return {
    ID: c.ID,
    Nombre: c.Nombre,
    Orden: Number(c.Orden) || 0,
    Visible: _aBooleano(c.Visible),
    IconoFontAwesome: c.IconoFontAwesome,
    Color: c.Color
  };
}

/**
 * Devuelve todas las categorias (incluidas no visibles) para gestion.
 * @return {Array<Object>}
 */
function obtenerCategoriasTodas() {
  return _leerHojaComoObjetos(HOJAS.CATEGORIAS)
    .map(_normalizarCategoria)
    .sort(function (a, b) { return a.Orden - b.Orden; });
}

/**
 * Devuelve productos de una categoria disponibles y visibles, ordenados.
 * @param {string} categoriaID
 * @return {Array<Object>}
 */
function obtenerProductosPorCategoria(categoriaID) {
  return _leerHojaComoObjetos(HOJAS.PRODUCTOS)
    .filter(function (p) {
      return p.CategoriaID === categoriaID && _aBooleano(p.Disponible) && _aBooleano(p.Visible);
    })
    .map(_normalizarProducto)
    .sort(function (a, b) { return a.Orden - b.Orden; });
}

/** Normaliza un producto (sin ImagenURL). */
function _normalizarProducto(p) {
  return {
    ID: p.ID,
    CategoriaID: p.CategoriaID,
    Nombre: p.Nombre,
    Descripcion: p.Descripcion,
    Precio: Number(p.Precio) || 0,
    Disponible: _aBooleano(p.Disponible),
    Visible: _aBooleano(p.Visible),
    Orden: Number(p.Orden) || 0,
    Etiquetas: p.Etiquetas ? String(p.Etiquetas) : '',
    TiempoPreparacionMin: Number(p.TiempoPreparacionMin) || 0,
    EsMenuDelDia: _aBooleano(p.EsMenuDelDia),
    FechaModificacion: p.FechaModificacion,
    ModificadoPor: p.ModificadoPor
  };
}

/**
 * Devuelve un producto completo mas su categoria.
 * @param {string} productoID
 * @return {Object|null}
 */
function obtenerProductoCompleto(productoID) {
  var productos = _leerHojaComoObjetos(HOJAS.PRODUCTOS);
  for (var i = 0; i < productos.length; i++) {
    if (productos[i].ID === productoID) {
      var prod = _normalizarProducto(productos[i]);
      prod.Categoria = _obtenerCategoriaPorID(prod.CategoriaID);
      return prod;
    }
  }
  return null;
}

/** Devuelve una categoria normalizada por ID. */
function _obtenerCategoriaPorID(categoriaID) {
  var cats = _leerHojaComoObjetos(HOJAS.CATEGORIAS);
  for (var i = 0; i < cats.length; i++) {
    if (cats[i].ID === categoriaID) return _normalizarCategoria(cats[i]);
  }
  return null;
}

// ===========================================================================
// UTILIDADES DE TIEMPO
// ===========================================================================

/** Convierte "HH:MM" a minutos desde medianoche. */
function _horaAMinutos(hora) {
  if (!hora) return 0;
  var partes = String(hora).split(':');
  return (parseInt(partes[0], 10) || 0) * 60 + (parseInt(partes[1], 10) || 0);
}

/** Convierte minutos desde medianoche a "HH:MM". */
function _minutosAHora(minutos) {
  var h = Math.floor(minutos / 60);
  var m = minutos % 60;
  return _pad2(h) + ':' + _pad2(m);
}

/** Rellena a 2 digitos. */
function _pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/** Formatea una fecha (Date o string) a "YYYY-MM-DD". */
function _fechaISO(fecha) {
  if (fecha instanceof Date) {
    return Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(fecha).substring(0, 10);
}

/** Devuelve true si la fecha "YYYY-MM-DD" es hoy o futura. */
function _esFechaFuturaOHoy(fechaISO) {
  var hoy = _fechaISO(new Date());
  return fechaISO >= hoy;
}

// ===========================================================================
// 6.3. MOTOR DE RESERVAS UNIFICADO
// ===========================================================================

/**
 * Consulta bloques horarios disponibles para un servicio/fecha/personas.
 * Considera capacidad, reservas existentes, bloqueos y duracion.
 * @param {string} servicioID
 * @param {string} fecha "YYYY-MM-DD"
 * @param {number} personas
 * @return {Object} {success, bloques:[{hora, disponibles, capacidad}], mensaje}
 */
function consultarDisponibilidad(servicioID, fecha, personas) {
  try {
    var servicio = _obtenerServicio(servicioID);
    if (!servicio || !servicio.Activo) {
      return { success: false, bloques: [], mensaje: 'Servicio no disponible.' };
    }
    personas = Number(personas) || 1;
    fecha = _fechaISO(fecha);

    var inicio = _horaAMinutos(servicio.HorarioInicio);
    var fin = _horaAMinutos(servicio.HorarioFin);
    var duracion = servicio.DuracionMinutos || 30;

    // Reservas activas del dia para este servicio.
    var reservas = _reservasActivasDelDia(servicioID, fecha);
    // Bloqueos que afectan a este servicio en la fecha.
    var bloqueos = _bloqueosDelDia(servicioID, fecha);

    var bloques = [];
    // Genera bloques desde inicio hasta que quepa la duracion.
    for (var t = inicio; t + duracion <= fin; t += duracion) {
      var horaBloque = _minutosAHora(t);

      // Si el bloque esta dentro de un bloqueo, se omite.
      if (_bloqueSolapaBloqueos(t, t + duracion, bloqueos)) continue;

      // Ocupacion: personas ya reservadas que solapan este bloque.
      var ocupadas = _personasOcupadasEnBloque(reservas, t, t + duracion);
      var disponibles = servicio.Capacidad - ocupadas;

      // Para servicios unitarios (Tinaja/Masaje capacidad<=capacidadmax) no se
      // permite solapamiento si ya hay una reserva ocupando el bloque.
      if (disponibles >= personas) {
        bloques.push({
          hora: horaBloque,
          disponibles: disponibles,
          capacidad: servicio.Capacidad
        });
      }
    }

    // Si la fecha es hoy, descarta bloques ya pasados.
    if (fecha === _fechaISO(new Date())) {
      var ahora = _minutosAhoraLocal();
      bloques = bloques.filter(function (b) {
        return _horaAMinutos(b.hora) > ahora;
      });
    }

    return { success: true, bloques: bloques, mensaje: '' };
  } catch (err) {
    return { success: false, bloques: [], mensaje: 'Error: ' + err.message };
  }
}

/** Minutos transcurridos hoy segun zona horaria del script. */
function _minutosAhoraLocal() {
  var ahora = new Date();
  var hhmm = Utilities.formatDate(ahora, Session.getScriptTimeZone(), 'HH:mm');
  return _horaAMinutos(hhmm);
}

/** Reservas activas (no canceladas) del dia para un servicio. */
function _reservasActivasDelDia(servicioID, fecha) {
  return _leerHojaComoObjetos(HOJAS.RESERVAS).filter(function (r) {
    return r.ServicioID === servicioID &&
      _fechaISO(r.Fecha) === fecha &&
      !_esEstadoCancelado(r.Estado);
  });
}

/** True si un estado es cancelado (huesped u hotel). */
function _esEstadoCancelado(estado) {
  return estado === ESTADOS.CANCELADA_HUESPED || estado === ESTADOS.CANCELADA_HOTEL;
}

/** Suma de personas de reservas que solapan un intervalo [ini,fin). */
function _personasOcupadasEnBloque(reservas, ini, fin) {
  var total = 0;
  reservas.forEach(function (r) {
    var rIni = _horaAMinutos(r.HoraInicio);
    var rFin = _horaAMinutos(r.HoraFin);
    if (rIni < fin && rFin > ini) { // hay solapamiento
      total += Number(r.Personas) || 1;
    }
  });
  return total;
}

/** Bloqueos que aplican a un servicio (o a todos) en una fecha. */
function _bloqueosDelDia(servicioID, fecha) {
  return _leerHojaComoObjetos(HOJAS.EVENTOS_BLOQUEOS).filter(function (b) {
    var aplicaServicio = !b.ServicioID || b.ServicioID === servicioID;
    var desde = _fechaISO(b.FechaInicio);
    var hasta = _fechaISO(b.FechaFin || b.FechaInicio);
    return aplicaServicio && fecha >= desde && fecha <= hasta;
  });
}

/** True si el intervalo solapa algun bloqueo horario. */
function _bloqueSolapaBloqueos(ini, fin, bloqueos) {
  for (var i = 0; i < bloqueos.length; i++) {
    var b = bloqueos[i];
    var bIni = b.HoraInicio ? _horaAMinutos(b.HoraInicio) : 0;
    var bFin = b.HoraFin ? _horaAMinutos(b.HoraFin) : 24 * 60;
    if (bIni < fin && bFin > ini) return true;
  }
  return false;
}

/**
 * Crea una reserva aplicando todas las validaciones server-side.
 * @param {Object} datos {habitacion, servicioID, fecha, horaInicio, personas, notas, solicitadoPor}
 * @return {Object} {success, id, estado, mensaje}
 */
function crearReserva(datos) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // evita condiciones de carrera en la capacidad

    // Validaciones basicas.
    if (!datos || !datos.habitacion || !datos.servicioID || !datos.fecha || !datos.horaInicio) {
      return { success: false, mensaje: 'Faltan datos obligatorios.' };
    }
    if (!_habitacionExiste(datos.habitacion)) {
      return { success: false, mensaje: 'La habitacion no existe.' };
    }
    var servicio = _obtenerServicio(datos.servicioID);
    if (!servicio || !servicio.Activo) {
      return { success: false, mensaje: 'El servicio no existe o no esta activo.' };
    }

    // Desayuno Habitacion puede estar deshabilitado en Configuracion.
    if (datos.servicioID === 'S002' && !_aBooleano(_obtenerConfigValor('DESAYUNO_HABITACION_ACTIVO'))) {
      return { success: false, mensaje: 'El desayuno a la habitacion no esta disponible actualmente.' };
    }

    var fecha = _fechaISO(datos.fecha);
    if (!_esFechaFuturaOHoy(fecha)) {
      return { success: false, mensaje: 'La fecha debe ser hoy o futura.' };
    }

    var personas = Number(datos.personas) || 1;
    var iniMin = _horaAMinutos(datos.horaInicio);
    var finMin = iniMin + servicio.DuracionMinutos;

    // Horario dentro del rango del servicio.
    if (iniMin < _horaAMinutos(servicio.HorarioInicio) ||
        finMin > _horaAMinutos(servicio.HorarioFin)) {
      return { success: false, mensaje: 'El horario esta fuera del rango permitido.' };
    }

    // No debe caer dentro de un bloqueo.
    var bloqueos = _bloqueosDelDia(datos.servicioID, fecha);
    if (_bloqueSolapaBloqueos(iniMin, finMin, bloqueos)) {
      return { success: false, mensaje: 'El horario esta bloqueado por el hotel.' };
    }

    // Verifica capacidad disponible en el bloque.
    var reservas = _reservasActivasDelDia(datos.servicioID, fecha);
    var ocupadas = _personasOcupadasEnBloque(reservas, iniMin, finMin);
    if (ocupadas + personas > servicio.Capacidad) {
      return { success: false, mensaje: 'No hay capacidad disponible en ese horario.' };
    }

    // Determina el estado inicial segun reglas de negocio.
    var estado = _estadoInicialSegunServicio(servicio);

    // Inserta la fila.
    var id = generarID();
    var horaFin = _minutosAHora(finMin);
    _hoja(HOJAS.RESERVAS).appendRow([
      id, new Date(), String(datos.habitacion), datos.servicioID, fecha,
      datos.horaInicio, horaFin, personas, estado,
      datos.solicitadoPor || 'Huesped', datos.notas || '', '', '', 'FALSE'
    ]);

    registrarLog('Crear reserva', servicio.Nombre + ' ' + fecha + ' ' + datos.horaInicio, datos.habitacion);

    // Genera notificacion para el staff.
    _crearNotificacion('reserva', 'Nueva reserva ' + servicio.Nombre + ' Hab ' + datos.habitacion +
      ' (' + estado + ')', 'RECEPCION', datos.habitacion, datos.servicioID, fecha);

    return { success: true, id: id, estado: estado, mensaje: 'Reserva creada correctamente.' };
  } catch (err) {
    return { success: false, mensaje: 'Error: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Determina el estado inicial de una reserva.
 * Servicios que requieren aprobacion (Tinaja, Bicicletas, Masajes) nacen
 * "Pendiente aprobacion". El resto nace "Solicitada".
 */
function _estadoInicialSegunServicio(servicio) {
  if (servicio.RequiereAprobacion) return ESTADOS.PENDIENTE;
  return ESTADOS.SOLICITADA;
}

/**
 * Modifica fecha/hora/personas/notas de una reserva.
 * No permite modificar si esta En curso, Finalizada o Cancelada.
 * @param {string} id
 * @param {Object} datos {fecha, horaInicio, personas, notas}
 * @return {Object} {success, mensaje}
 */
function modificarReserva(id, datos) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var hoja = _hoja(HOJAS.RESERVAS);
    var reserva = _buscarReservaPorID(id);
    if (!reserva) return { success: false, mensaje: 'Reserva no encontrada.' };

    if ([ESTADOS.EN_CURSO, ESTADOS.FINALIZADA, ESTADOS.CANCELADA_HUESPED,
         ESTADOS.CANCELADA_HOTEL].indexOf(reserva.Estado) !== -1) {
      return { success: false, mensaje: 'No se puede modificar una reserva ' + reserva.Estado + '.' };
    }

    var servicio = _obtenerServicio(reserva.ServicioID);
    var fecha = datos.fecha ? _fechaISO(datos.fecha) : _fechaISO(reserva.Fecha);
    var horaInicio = datos.horaInicio || reserva.HoraInicio;
    var personas = datos.personas ? Number(datos.personas) : Number(reserva.Personas);

    if (!_esFechaFuturaOHoy(fecha)) {
      return { success: false, mensaje: 'La fecha debe ser hoy o futura.' };
    }

    var iniMin = _horaAMinutos(horaInicio);
    var finMin = iniMin + servicio.DuracionMinutos;
    if (iniMin < _horaAMinutos(servicio.HorarioInicio) ||
        finMin > _horaAMinutos(servicio.HorarioFin)) {
      return { success: false, mensaje: 'El horario esta fuera del rango permitido.' };
    }

    // Revalida capacidad excluyendo esta misma reserva.
    var reservas = _reservasActivasDelDia(reserva.ServicioID, fecha).filter(function (r) {
      return r.ID !== id;
    });
    var ocupadas = _personasOcupadasEnBloque(reservas, iniMin, finMin);
    if (ocupadas + personas > servicio.Capacidad) {
      return { success: false, mensaje: 'No hay capacidad disponible en ese horario.' };
    }

    var fila = reserva._fila;
    hoja.getRange(fila, _indiceColumna(hoja, 'Fecha') + 1).setValue(fecha);
    hoja.getRange(fila, _indiceColumna(hoja, 'HoraInicio') + 1).setValue(horaInicio);
    hoja.getRange(fila, _indiceColumna(hoja, 'HoraFin') + 1).setValue(_minutosAHora(finMin));
    hoja.getRange(fila, _indiceColumna(hoja, 'Personas') + 1).setValue(personas);
    if (datos.notas !== undefined) {
      hoja.getRange(fila, _indiceColumna(hoja, 'Notas') + 1).setValue(datos.notas);
    }

    registrarLog('Modificar reserva', id, reserva.Habitacion);
    return { success: true, mensaje: 'Reserva modificada.' };
  } catch (err) {
    return { success: false, mensaje: 'Error: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Cancela una reserva. Libera capacidad automaticamente (queda excluida por
 * su estado en los calculos de ocupacion).
 * @param {string} id
 * @param {string} motivo
 * @param {boolean} esHotel Si true, "Cancelada hotel"; si no, "Cancelada huesped".
 * @return {Object} {success, mensaje}
 */
function cancelarReserva(id, motivo, esHotel) {
  var hoja = _hoja(HOJAS.RESERVAS);
  var reserva = _buscarReservaPorID(id);
  if (!reserva) return { success: false, mensaje: 'Reserva no encontrada.' };

  if (_esEstadoCancelado(reserva.Estado)) {
    return { success: false, mensaje: 'La reserva ya estaba cancelada.' };
  }
  if ([ESTADOS.EN_CURSO, ESTADOS.FINALIZADA].indexOf(reserva.Estado) !== -1) {
    return { success: false, mensaje: 'No se puede cancelar una reserva ' + reserva.Estado + '.' };
  }

  var nuevoEstado = esHotel ? ESTADOS.CANCELADA_HOTEL : ESTADOS.CANCELADA_HUESPED;
  var fila = reserva._fila;
  hoja.getRange(fila, _indiceColumna(hoja, 'Estado') + 1).setValue(nuevoEstado);
  hoja.getRange(fila, _indiceColumna(hoja, 'MotivoCancelacion') + 1).setValue(motivo || '');

  registrarLog('Cancelar reserva', id + ' -> ' + nuevoEstado, reserva.Habitacion);
  return { success: true, mensaje: 'Reserva cancelada.' };
}

/** Busca una reserva por ID (devuelve objeto con _fila o null). */
function _buscarReservaPorID(id) {
  var reservas = _leerHojaComoObjetos(HOJAS.RESERVAS);
  for (var i = 0; i < reservas.length; i++) {
    if (reservas[i].ID === id) return reservas[i];
  }
  return null;
}

/**
 * Cambia el estado de una reserva (uso de staff: confirmar, en curso, etc.).
 * @param {string} id
 * @param {string} nuevoEstado
 * @return {Object} {success, mensaje}
 */
function cambiarEstadoReserva(id, nuevoEstado) {
  // Valida que el estado sea uno permitido.
  var permitidos = [];
  for (var k in ESTADOS) permitidos.push(ESTADOS[k]);
  if (permitidos.indexOf(nuevoEstado) === -1) {
    return { success: false, mensaje: 'Estado no valido.' };
  }
  var hoja = _hoja(HOJAS.RESERVAS);
  var reserva = _buscarReservaPorID(id);
  if (!reserva) return { success: false, mensaje: 'Reserva no encontrada.' };
  hoja.getRange(reserva._fila, _indiceColumna(hoja, 'Estado') + 1).setValue(nuevoEstado);
  registrarLog('Cambiar estado reserva', id + ' -> ' + nuevoEstado, reserva.Habitacion);
  return { success: true, mensaje: 'Estado actualizado.' };
}

/**
 * Devuelve reservas filtradas y enriquecidas con nombre de servicio.
 * @param {Object} filtros {fechaDesde, fechaHasta, habitacion, servicioID, estados}
 * @return {Array<Object>}
 */
function obtenerReservas(filtros) {
  filtros = filtros || {};
  var servicios = {};
  obtenerServiciosActivos().forEach(function (s) { servicios[s.ID] = s.Nombre; });
  // Tambien incluye servicios inactivos por nombre.
  _leerHojaComoObjetos(HOJAS.SERVICIOS).forEach(function (s) { servicios[s.ID] = s.Nombre; });

  return _leerHojaComoObjetos(HOJAS.RESERVAS).filter(function (r) {
    var fecha = _fechaISO(r.Fecha);
    if (filtros.fechaDesde && fecha < _fechaISO(filtros.fechaDesde)) return false;
    if (filtros.fechaHasta && fecha > _fechaISO(filtros.fechaHasta)) return false;
    if (filtros.habitacion && String(r.Habitacion) !== String(filtros.habitacion)) return false;
    if (filtros.servicioID && r.ServicioID !== filtros.servicioID) return false;
    if (filtros.estados && filtros.estados.length && filtros.estados.indexOf(r.Estado) === -1) return false;
    return true;
  }).map(function (r) {
    return {
      ID: r.ID,
      Timestamp: r.Timestamp,
      Habitacion: String(r.Habitacion),
      ServicioID: r.ServicioID,
      ServicioNombre: servicios[r.ServicioID] || r.ServicioID,
      Fecha: _fechaISO(r.Fecha),
      HoraInicio: r.HoraInicio,
      HoraFin: r.HoraFin,
      Personas: Number(r.Personas) || 0,
      Estado: r.Estado,
      SolicitadoPor: r.SolicitadoPor,
      Notas: r.Notas,
      PrepedidoID: r.PrepedidoID,
      MotivoCancelacion: r.MotivoCancelacion,
      EsEvento: _aBooleano(r.EsEvento)
    };
  }).sort(function (a, b) {
    return (a.Fecha + a.HoraInicio) < (b.Fecha + b.HoraInicio) ? -1 : 1;
  });
}

// ===========================================================================
// 6.4. GESTION DE PEDIDOS (PREPEDIDO)
// ===========================================================================

/**
 * Crea un pedido asociado a una reserva.
 * @param {string} reservaID
 * @param {Array} items [{productoID, cantidad, notas}]
 * @param {string} notas Notas generales del pedido.
 * @return {Object} {success, pedidoID, total, mensaje}
 */
function crearPedido(reservaID, items, notas) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var reserva = _buscarReservaPorID(reservaID);
    if (!reserva) return { success: false, mensaje: 'Reserva no encontrada.' };
    if (!items || !items.length) return { success: false, mensaje: 'El pedido esta vacio.' };

    // Verifica ventana de tiempo de prepedido.
    var validacionTiempo = _validarVentanaPrepedido(reserva);
    if (!validacionTiempo.ok) return { success: false, mensaje: validacionTiempo.mensaje };

    // Si ya existe un pedido para la reserva, redirige a modificar.
    var existente = _buscarPedidoPorReserva(reservaID);
    if (existente) {
      return modificarPedido(existente.ID, items);
    }

    // Calcula subtotales y total leyendo precios desde la hoja Productos.
    var calculo = _calcularItems(items);
    if (!calculo.ok) return { success: false, mensaje: calculo.mensaje };

    var pedidoID = generarID();
    _hoja(HOJAS.PEDIDOS).appendRow([
      pedidoID, reservaID, String(reserva.Habitacion), 'Registrado',
      calculo.total, new Date(), notas || ''
    ]);

    // Inserta cada detalle.
    var hojaDetalle = _hoja(HOJAS.DETALLE_PEDIDOS);
    calculo.detalles.forEach(function (d) {
      hojaDetalle.appendRow([
        generarID(), pedidoID, d.productoID, d.cantidad, d.precioUnitario, d.subtotal, d.notas || ''
      ]);
    });

    // Vincula el pedido a la reserva.
    var hojaReservas = _hoja(HOJAS.RESERVAS);
    hojaReservas.getRange(reserva._fila, _indiceColumna(hojaReservas, 'PrepedidoID') + 1).setValue(pedidoID);

    registrarLog('Crear pedido', pedidoID + ' total ' + calculo.total, reserva.Habitacion);
    _crearNotificacion('pedido', 'Nuevo prepedido Hab ' + reserva.Habitacion, 'COCINA',
      reserva.Habitacion, reserva.ServicioID, _fechaISO(reserva.Fecha));

    return { success: true, pedidoID: pedidoID, total: calculo.total, mensaje: 'Pedido registrado.' };
  } catch (err) {
    return { success: false, mensaje: 'Error: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Modifica los items de un pedido existente. Solo si falta mas del limite
 * configurado para la hora de la reserva.
 * @param {string} pedidoID
 * @param {Array} items [{productoID, cantidad, notas}]
 * @return {Object} {success, total, mensaje}
 */
function modificarPedido(pedidoID, items) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var pedido = _buscarPedidoPorID(pedidoID);
    if (!pedido) return { success: false, mensaje: 'Pedido no encontrado.' };
    var reserva = _buscarReservaPorID(pedido.ReservaID);
    if (!reserva) return { success: false, mensaje: 'Reserva asociada no encontrada.' };

    var validacionTiempo = _validarVentanaPrepedido(reserva);
    if (!validacionTiempo.ok) return { success: false, mensaje: validacionTiempo.mensaje };

    if (!items || !items.length) return { success: false, mensaje: 'El pedido no puede quedar vacio.' };

    var calculo = _calcularItems(items);
    if (!calculo.ok) return { success: false, mensaje: calculo.mensaje };

    // Borra los detalles anteriores del pedido.
    _borrarDetallesDePedido(pedidoID);

    // Inserta los nuevos detalles.
    var hojaDetalle = _hoja(HOJAS.DETALLE_PEDIDOS);
    calculo.detalles.forEach(function (d) {
      hojaDetalle.appendRow([
        generarID(), pedidoID, d.productoID, d.cantidad, d.precioUnitario, d.subtotal, d.notas || ''
      ]);
    });

    // Actualiza el total del pedido.
    var hojaPedidos = _hoja(HOJAS.PEDIDOS);
    hojaPedidos.getRange(pedido._fila, _indiceColumna(hojaPedidos, 'Total') + 1).setValue(calculo.total);

    registrarLog('Modificar pedido', pedidoID + ' total ' + calculo.total, pedido.Habitacion);
    return { success: true, total: calculo.total, mensaje: 'Pedido actualizado.' };
  } catch (err) {
    return { success: false, mensaje: 'Error: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Valida que la reserva permita (o siga permitiendo) prepedido segun la
 * ventana de PREPEDIDO_MINUTOS_LIMITE.
 * @return {Object} {ok, mensaje}
 */
function _validarVentanaPrepedido(reserva) {
  var limite = Number(_obtenerConfigValor('PREPEDIDO_MINUTOS_LIMITE')) || 30;
  var fecha = _fechaISO(reserva.Fecha);
  var hoy = _fechaISO(new Date());

  // Si la reserva es en fecha futura, siempre se puede.
  if (fecha > hoy) return { ok: true, mensaje: '' };
  // Si ya paso el dia, no se puede.
  if (fecha < hoy) return { ok: false, mensaje: 'La reserva ya paso.' };

  // Mismo dia: comparar contra la hora limite.
  var horaReserva = _horaAMinutos(reserva.HoraInicio);
  var ahora = _minutosAhoraLocal();
  if (ahora + limite > horaReserva) {
    return { ok: false, mensaje: 'El pedido solo puede modificarse hasta ' + limite +
      ' min antes de la reserva.' };
  }
  return { ok: true, mensaje: '' };
}

/** Calcula detalles/subtotales/total leyendo precios reales de Productos. */
function _calcularItems(items) {
  var productos = {};
  _leerHojaComoObjetos(HOJAS.PRODUCTOS).forEach(function (p) {
    productos[p.ID] = _normalizarProducto(p);
  });

  var detalles = [];
  var total = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var prod = productos[it.productoID];
    if (!prod) return { ok: false, mensaje: 'Producto no encontrado: ' + it.productoID };
    if (!prod.Disponible) return { ok: false, mensaje: 'Producto agotado: ' + prod.Nombre };
    var cantidad = Number(it.cantidad) || 0;
    if (cantidad <= 0) continue;
    var subtotal = prod.Precio * cantidad;
    total += subtotal;
    detalles.push({
      productoID: prod.ID,
      cantidad: cantidad,
      precioUnitario: prod.Precio,
      subtotal: subtotal,
      notas: it.notas || ''
    });
  }
  if (!detalles.length) return { ok: false, mensaje: 'No hay items validos en el pedido.' };
  return { ok: true, detalles: detalles, total: total };
}

/** Busca un pedido por ID. */
function _buscarPedidoPorID(pedidoID) {
  var pedidos = _leerHojaComoObjetos(HOJAS.PEDIDOS);
  for (var i = 0; i < pedidos.length; i++) {
    if (pedidos[i].ID === pedidoID) return pedidos[i];
  }
  return null;
}

/** Busca un pedido por reserva. */
function _buscarPedidoPorReserva(reservaID) {
  var pedidos = _leerHojaComoObjetos(HOJAS.PEDIDOS);
  for (var i = 0; i < pedidos.length; i++) {
    if (pedidos[i].ReservaID === reservaID) return pedidos[i];
  }
  return null;
}

/** Borra fisicamente los detalles de un pedido (para reemplazo). */
function _borrarDetallesDePedido(pedidoID) {
  var hoja = _hoja(HOJAS.DETALLE_PEDIDOS);
  var datos = hoja.getDataRange().getValues();
  // Recorre de abajo hacia arriba para borrar filas con seguridad.
  for (var i = datos.length - 1; i >= 1; i--) {
    if (datos[i][1] === pedidoID) { // columna PedidoID (indice 1)
      hoja.deleteRow(i + 1);
    }
  }
}

/**
 * Devuelve el pedido de una reserva con sus detalles enriquecidos.
 * @param {string} reservaID
 * @return {Object|null} {pedido, detalles:[{...producto}]}
 */
function obtenerPedidosPorReserva(reservaID) {
  var pedido = _buscarPedidoPorReserva(reservaID);
  if (!pedido) return null;

  var productos = {};
  _leerHojaComoObjetos(HOJAS.PRODUCTOS).forEach(function (p) {
    productos[p.ID] = _normalizarProducto(p);
  });

  var detalles = _leerHojaComoObjetos(HOJAS.DETALLE_PEDIDOS)
    .filter(function (d) { return d.PedidoID === pedido.ID; })
    .map(function (d) {
      var prod = productos[d.ProductoID] || {};
      return {
        ProductoID: d.ProductoID,
        Nombre: prod.Nombre || d.ProductoID,
        Cantidad: Number(d.Cantidad) || 0,
        PrecioUnitario: Number(d.PrecioUnitario) || 0,
        Subtotal: Number(d.Subtotal) || 0,
        Notas: d.Notas
      };
    });

  return {
    pedido: {
      ID: pedido.ID,
      ReservaID: pedido.ReservaID,
      Habitacion: String(pedido.Habitacion),
      Estado: pedido.Estado,
      Total: Number(pedido.Total) || 0,
      Timestamp: pedido.Timestamp,
      Notas: pedido.Notas
    },
    detalles: detalles
  };
}

// ===========================================================================
// 6.5. CENTRO DE OPERACIONES Y ALERTAS
// ===========================================================================

/**
 * Devuelve el timeline del dia agrupado por hora.
 * @param {string} fecha "YYYY-MM-DD"
 * @return {Object} {fecha, bloques:[{hora, items:[...]}], alertas:[...]}
 */
function obtenerCentroOperaciones(fecha) {
  fecha = _fechaISO(fecha || new Date());
  var servicios = {};
  _leerHojaComoObjetos(HOJAS.SERVICIOS).forEach(function (s) {
    servicios[s.ID] = _normalizarServicio(s);
  });

  var reservas = _leerHojaComoObjetos(HOJAS.RESERVAS).filter(function (r) {
    return _fechaISO(r.Fecha) === fecha && !_esEstadoCancelado(r.Estado);
  });

  // Agrupa por hora de inicio.
  var mapaHoras = {};
  reservas.forEach(function (r) {
    var hora = r.HoraInicio;
    if (!mapaHoras[hora]) mapaHoras[hora] = [];
    var serv = servicios[r.ServicioID] || {};
    mapaHoras[hora].push({
      reservaID: r.ID,
      servicioID: r.ServicioID,
      servicioNombre: serv.Nombre || r.ServicioID,
      habitacion: String(r.Habitacion),
      personas: Number(r.Personas) || 0,
      capacidad: serv.Capacidad || 0,
      estado: r.Estado
    });
  });

  // Ordena bloques por hora.
  var horas = Object.keys(mapaHoras).sort(function (a, b) {
    return _horaAMinutos(a) - _horaAMinutos(b);
  });
  var bloques = horas.map(function (h) {
    // Calcula ocupacion por servicio dentro del bloque.
    var ocupacionPorServicio = {};
    mapaHoras[h].forEach(function (it) {
      ocupacionPorServicio[it.servicioID] = (ocupacionPorServicio[it.servicioID] || 0) + it.personas;
    });
    return {
      hora: h,
      items: mapaHoras[h],
      ocupacionPorServicio: ocupacionPorServicio
    };
  });

  // Genera alertas de capacidad casi llena.
  var alertas = _generarAlertasCapacidad(fecha, servicios);

  return { fecha: fecha, bloques: bloques, alertas: alertas };
}

/** Genera alertas de "quedan N cupos" para servicios gastronomicos. */
function _generarAlertasCapacidad(fecha, servicios) {
  var alertas = [];
  var reservas = _leerHojaComoObjetos(HOJAS.RESERVAS).filter(function (r) {
    return _fechaISO(r.Fecha) === fecha && !_esEstadoCancelado(r.Estado);
  });
  // Agrupa ocupacion por servicio+hora.
  var mapa = {};
  reservas.forEach(function (r) {
    var clave = r.ServicioID + '|' + r.HoraInicio;
    mapa[clave] = (mapa[clave] || 0) + (Number(r.Personas) || 0);
  });
  Object.keys(mapa).forEach(function (clave) {
    var partes = clave.split('|');
    var serv = servicios[partes[0]];
    if (!serv) return;
    var restante = serv.Capacidad - mapa[clave];
    if (restante <= 2 && restante > 0) {
      alertas.push('Quedan ' + restante + ' cupos para ' + serv.Nombre + ' a las ' + partes[1] + '.');
    } else if (restante <= 0) {
      alertas.push(serv.Nombre + ' completo a las ' + partes[1] + '.');
    }
  });
  return alertas;
}

/**
 * Devuelve notificaciones para un rol/habitacion. Genera automaticamente las
 * alertas de capacidad faltantes del dia si se consulta.
 * @param {string} rol
 * @param {string} habitacion
 * @param {boolean} soloNoLeidas
 * @return {Array<Object>}
 */
function obtenerNotificaciones(rol, habitacion, soloNoLeidas) {
  // Genera alertas automaticas de capacidad para hoy (evita duplicados).
  _sincronizarAlertasCapacidad();

  return _leerHojaComoObjetos(HOJAS.NOTIFICACIONES).filter(function (n) {
    if (soloNoLeidas && _aBooleano(n.Leida)) return false;
    if (rol && n.DestinatarioRol && n.DestinatarioRol !== rol && n.DestinatarioRol !== 'TODOS') return false;
    if (habitacion && n.Habitacion && String(n.Habitacion) !== String(habitacion)) return false;
    return true;
  }).map(function (n) {
    return {
      ID: n.ID,
      Timestamp: n.Timestamp,
      Tipo: n.Tipo,
      Mensaje: n.Mensaje,
      DestinatarioRol: n.DestinatarioRol,
      Habitacion: String(n.Habitacion || ''),
      ServicioID: n.ServicioID,
      Leida: _aBooleano(n.Leida),
      FechaReferencia: _fechaISO(n.FechaReferencia)
    };
  }).sort(function (a, b) { return a.Timestamp < b.Timestamp ? 1 : -1; });
}

/** Crea (una vez por dia) notificaciones de capacidad para el staff. */
function _sincronizarAlertasCapacidad() {
  var fecha = _fechaISO(new Date());
  var servicios = {};
  _leerHojaComoObjetos(HOJAS.SERVICIOS).forEach(function (s) {
    servicios[s.ID] = _normalizarServicio(s);
  });
  var alertas = _generarAlertasCapacidad(fecha, servicios);

  // Evita duplicar: recolecta mensajes ya existentes hoy.
  var existentes = {};
  _leerHojaComoObjetos(HOJAS.NOTIFICACIONES).forEach(function (n) {
    if (_fechaISO(n.FechaReferencia) === fecha) existentes[n.Mensaje] = true;
  });

  alertas.forEach(function (msg) {
    if (!existentes[msg]) {
      _crearNotificacion('capacidad', msg, 'RECEPCION', '', '', fecha);
    }
  });
}

/** Inserta una notificacion. */
function _crearNotificacion(tipo, mensaje, destinatarioRol, habitacion, servicioID, fechaReferencia) {
  _hoja(HOJAS.NOTIFICACIONES).appendRow([
    generarID(), new Date(), tipo, mensaje, destinatarioRol || 'TODOS',
    habitacion || '', servicioID || '', 'FALSE', _fechaISO(fechaReferencia || new Date())
  ]);
}

/**
 * Marca una notificacion como leida.
 * @param {string} id
 * @return {Object} {success}
 */
function marcarNotificacionLeida(id) {
  var hoja = _hoja(HOJAS.NOTIFICACIONES);
  var datos = _leerHojaComoObjetos(HOJAS.NOTIFICACIONES);
  for (var i = 0; i < datos.length; i++) {
    if (datos[i].ID === id) {
      hoja.getRange(datos[i]._fila, _indiceColumna(hoja, 'Leida') + 1).setValue('TRUE');
      return { success: true };
    }
  }
  return { success: false, mensaje: 'Notificacion no encontrada.' };
}

// ===========================================================================
// 6.6. BLOQUEOS Y EVENTOS
// ===========================================================================

/**
 * Devuelve bloqueos en un rango que afecten a un servicio (o todos).
 * @param {string} fechaInicio
 * @param {string} fechaFin
 * @param {string} servicioID Opcional.
 * @return {Array<Object>}
 */
function obtenerBloqueos(fechaInicio, fechaFin, servicioID) {
  var desde = _fechaISO(fechaInicio);
  var hasta = _fechaISO(fechaFin);
  return _leerHojaComoObjetos(HOJAS.EVENTOS_BLOQUEOS).filter(function (b) {
    var bDesde = _fechaISO(b.FechaInicio);
    var bHasta = _fechaISO(b.FechaFin || b.FechaInicio);
    // Solapamiento de rangos.
    if (bHasta < desde || bDesde > hasta) return false;
    if (servicioID && b.ServicioID && b.ServicioID !== servicioID) return false;
    return true;
  }).map(function (b) {
    return {
      ID: b.ID,
      Tipo: b.Tipo,
      ServicioID: b.ServicioID,
      FechaInicio: _fechaISO(b.FechaInicio),
      FechaFin: _fechaISO(b.FechaFin || b.FechaInicio),
      HoraInicio: b.HoraInicio,
      HoraFin: b.HoraFin,
      Motivo: b.Motivo,
      CreadoPor: b.CreadoPor,
      Timestamp: b.Timestamp
    };
  });
}

/**
 * Crea un bloqueo/evento. Solo roles RECEPCION o ADMINISTRADOR.
 * @param {Object} datos {tipo, servicioID, fechaInicio, fechaFin, horaInicio, horaFin, motivo, email}
 * @return {Object} {success, id, mensaje}
 */
function crearBloqueo(datos) {
  if (!_validarRolPermitido(datos.email, ['RECEPCION', 'ADMINISTRADOR'])) {
    return { success: false, mensaje: 'No tienes permisos para crear bloqueos.' };
  }
  if (!datos.fechaInicio) return { success: false, mensaje: 'Falta la fecha de inicio.' };

  var id = generarID();
  _hoja(HOJAS.EVENTOS_BLOQUEOS).appendRow([
    id, datos.tipo || 'Bloqueo', datos.servicioID || '', _fechaISO(datos.fechaInicio),
    _fechaISO(datos.fechaFin || datos.fechaInicio), datos.horaInicio || '', datos.horaFin || '',
    datos.motivo || '', datos.email || '', new Date()
  ]);
  registrarLog('Crear bloqueo', datos.tipo + ' ' + (datos.servicioID || 'TODOS'), '');
  return { success: true, id: id, mensaje: 'Bloqueo creado.' };
}

// ===========================================================================
// 6.7. CRUD DE PRODUCTOS (GESTION DE CARTA)
// ===========================================================================

/**
 * Crea o actualiza un producto. Rol COCINA o ADMINISTRADOR. NO incluye imagen.
 * @param {Object} datos {id, categoriaID, nombre, descripcion, precio, disponible,
 *   visible, orden, etiquetas, tiempoPreparacionMin, esMenuDelDia, email}
 * @return {Object} {success, id, mensaje}
 */
function guardarProducto(datos) {
  if (!_validarRolPermitido(datos.email, ['COCINA', 'ADMINISTRADOR'])) {
    return { success: false, mensaje: 'No tienes permisos para editar la carta.' };
  }
  if (!datos.nombre || !datos.categoriaID) {
    return { success: false, mensaje: 'Nombre y categoria son obligatorios.' };
  }

  var hoja = _hoja(HOJAS.PRODUCTOS);
  var ahora = new Date();
  var modificadoPor = datos.email || 'sistema';

  // Booleanos como texto para consistencia con la hoja.
  var disponible = datos.disponible ? 'TRUE' : 'FALSE';
  var visible = datos.visible ? 'TRUE' : 'FALSE';
  var esMenu = datos.esMenuDelDia ? 'TRUE' : 'FALSE';
  var precio = Number(datos.precio) || 0;
  var orden = Number(datos.orden) || 0;
  var tiempo = Number(datos.tiempoPreparacionMin) || 0;

  if (datos.id) {
    // Actualiza producto existente.
    var existente = null;
    var productos = _leerHojaComoObjetos(HOJAS.PRODUCTOS);
    for (var i = 0; i < productos.length; i++) {
      if (productos[i].ID === datos.id) { existente = productos[i]; break; }
    }
    if (!existente) return { success: false, mensaje: 'Producto no encontrado.' };
    var fila = existente._fila;
    hoja.getRange(fila, _indiceColumna(hoja, 'CategoriaID') + 1).setValue(datos.categoriaID);
    hoja.getRange(fila, _indiceColumna(hoja, 'Nombre') + 1).setValue(datos.nombre);
    hoja.getRange(fila, _indiceColumna(hoja, 'Descripcion') + 1).setValue(datos.descripcion || '');
    hoja.getRange(fila, _indiceColumna(hoja, 'Precio') + 1).setValue(precio);
    hoja.getRange(fila, _indiceColumna(hoja, 'Disponible') + 1).setValue(disponible);
    hoja.getRange(fila, _indiceColumna(hoja, 'Visible') + 1).setValue(visible);
    hoja.getRange(fila, _indiceColumna(hoja, 'Orden') + 1).setValue(orden);
    hoja.getRange(fila, _indiceColumna(hoja, 'Etiquetas') + 1).setValue(datos.etiquetas || '');
    hoja.getRange(fila, _indiceColumna(hoja, 'TiempoPreparacionMin') + 1).setValue(tiempo);
    hoja.getRange(fila, _indiceColumna(hoja, 'EsMenuDelDia') + 1).setValue(esMenu);
    hoja.getRange(fila, _indiceColumna(hoja, 'FechaModificacion') + 1).setValue(ahora);
    hoja.getRange(fila, _indiceColumna(hoja, 'ModificadoPor') + 1).setValue(modificadoPor);
    registrarLog('Editar producto', datos.id + ' ' + datos.nombre, '');
    return { success: true, id: datos.id, mensaje: 'Producto actualizado.' };
  } else {
    // Crea producto nuevo.
    var nuevoID = _generarProximoProductoID();
    hoja.appendRow([
      nuevoID, datos.categoriaID, datos.nombre, datos.descripcion || '', precio,
      disponible, visible, orden, datos.etiquetas || '', tiempo, esMenu, ahora, modificadoPor
    ]);
    registrarLog('Crear producto', nuevoID + ' ' + datos.nombre, '');
    return { success: true, id: nuevoID, mensaje: 'Producto creado.' };
  }
}

/** Genera el proximo ID de producto tipo P###. */
function _generarProximoProductoID() {
  var productos = _leerHojaComoObjetos(HOJAS.PRODUCTOS);
  var max = 0;
  productos.forEach(function (p) {
    var m = String(p.ID).match(/^P(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'P' + _pad3(max + 1);
}

/** Rellena a 3 digitos. */
function _pad3(n) {
  if (n < 10) return '00' + n;
  if (n < 100) return '0' + n;
  return String(n);
}

/**
 * Soft delete de producto: Visible=FALSE y Disponible=FALSE.
 * @param {string} productoID
 * @param {string} email
 * @return {Object} {success, mensaje}
 */
function eliminarProducto(productoID, email) {
  if (!_validarRolPermitido(email, ['COCINA', 'ADMINISTRADOR'])) {
    return { success: false, mensaje: 'No tienes permisos.' };
  }
  var hoja = _hoja(HOJAS.PRODUCTOS);
  var productos = _leerHojaComoObjetos(HOJAS.PRODUCTOS);
  for (var i = 0; i < productos.length; i++) {
    if (productos[i].ID === productoID) {
      var fila = productos[i]._fila;
      hoja.getRange(fila, _indiceColumna(hoja, 'Visible') + 1).setValue('FALSE');
      hoja.getRange(fila, _indiceColumna(hoja, 'Disponible') + 1).setValue('FALSE');
      hoja.getRange(fila, _indiceColumna(hoja, 'FechaModificacion') + 1).setValue(new Date());
      hoja.getRange(fila, _indiceColumna(hoja, 'ModificadoPor') + 1).setValue(email || 'sistema');
      registrarLog('Eliminar producto (soft)', productoID, '');
      return { success: true, mensaje: 'Producto ocultado.' };
    }
  }
  return { success: false, mensaje: 'Producto no encontrado.' };
}

/**
 * Devuelve un producto para poblar el formulario de edicion.
 * @param {string} productoID
 * @return {Object|null}
 */
function obtenerProductoParaEditar(productoID) {
  var productos = _leerHojaComoObjetos(HOJAS.PRODUCTOS);
  for (var i = 0; i < productos.length; i++) {
    if (productos[i].ID === productoID) return _normalizarProducto(productos[i]);
  }
  return null;
}

/**
 * Cambia solo el campo Disponible (toggle "Agotado hoy").
 * @param {string} productoID
 * @param {boolean} nuevoEstado
 * @param {string} email
 * @return {Object} {success, mensaje}
 */
function toggleDisponibleProducto(productoID, nuevoEstado, email) {
  if (!_validarRolPermitido(email, ['COCINA', 'ADMINISTRADOR'])) {
    return { success: false, mensaje: 'No tienes permisos.' };
  }
  var hoja = _hoja(HOJAS.PRODUCTOS);
  var productos = _leerHojaComoObjetos(HOJAS.PRODUCTOS);
  for (var i = 0; i < productos.length; i++) {
    if (productos[i].ID === productoID) {
      var fila = productos[i]._fila;
      hoja.getRange(fila, _indiceColumna(hoja, 'Disponible') + 1).setValue(nuevoEstado ? 'TRUE' : 'FALSE');
      hoja.getRange(fila, _indiceColumna(hoja, 'FechaModificacion') + 1).setValue(new Date());
      hoja.getRange(fila, _indiceColumna(hoja, 'ModificadoPor') + 1).setValue(email || 'sistema');
      registrarLog('Toggle disponible', productoID + ' -> ' + nuevoEstado, '');
      return { success: true, mensaje: 'Disponibilidad actualizada.' };
    }
  }
  return { success: false, mensaje: 'Producto no encontrado.' };
}

/**
 * Devuelve todos los productos (incluidos no visibles) para gestion.
 * @return {Array<Object>}
 */
function obtenerProductosGestion() {
  return _leerHojaComoObjetos(HOJAS.PRODUCTOS)
    .map(_normalizarProducto)
    .sort(function (a, b) { return a.Orden - b.Orden; });
}

// ===========================================================================
// 6.8. CRUD DE CATEGORIAS (SOLO ADMIN)
// ===========================================================================

/**
 * Crea o actualiza una categoria. Rol ADMINISTRADOR.
 * @param {Object} datos {id, nombre, orden, visible, iconoFontAwesome, color, email}
 * @return {Object} {success, id, mensaje}
 */
function guardarCategoria(datos) {
  if (!_validarRolPermitido(datos.email, ['ADMINISTRADOR'])) {
    return { success: false, mensaje: 'Solo el administrador puede gestionar categorias.' };
  }
  if (!datos.nombre) return { success: false, mensaje: 'El nombre es obligatorio.' };

  var hoja = _hoja(HOJAS.CATEGORIAS);
  var visible = datos.visible ? 'TRUE' : 'FALSE';
  var orden = Number(datos.orden) || 0;

  if (datos.id) {
    var cats = _leerHojaComoObjetos(HOJAS.CATEGORIAS);
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].ID === datos.id) {
        var fila = cats[i]._fila;
        hoja.getRange(fila, _indiceColumna(hoja, 'Nombre') + 1).setValue(datos.nombre);
        hoja.getRange(fila, _indiceColumna(hoja, 'Orden') + 1).setValue(orden);
        hoja.getRange(fila, _indiceColumna(hoja, 'Visible') + 1).setValue(visible);
        hoja.getRange(fila, _indiceColumna(hoja, 'IconoFontAwesome') + 1).setValue(datos.iconoFontAwesome || 'fa-utensils');
        hoja.getRange(fila, _indiceColumna(hoja, 'Color') + 1).setValue(datos.color || '#D4AF37');
        registrarLog('Editar categoria', datos.id, '');
        return { success: true, id: datos.id, mensaje: 'Categoria actualizada.' };
      }
    }
    return { success: false, mensaje: 'Categoria no encontrada.' };
  } else {
    var nuevoID = _generarProximaCategoriaID();
    hoja.appendRow([nuevoID, datos.nombre, orden, visible,
      datos.iconoFontAwesome || 'fa-utensils', datos.color || '#D4AF37']);
    registrarLog('Crear categoria', nuevoID + ' ' + datos.nombre, '');
    return { success: true, id: nuevoID, mensaje: 'Categoria creada.' };
  }
}

/** Genera el proximo ID de categoria tipo CAT##. */
function _generarProximaCategoriaID() {
  var cats = _leerHojaComoObjetos(HOJAS.CATEGORIAS);
  var max = 0;
  cats.forEach(function (c) {
    var m = String(c.ID).match(/^CAT(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  var n = max + 1;
  return 'CAT' + (n < 10 ? '0' + n : String(n));
}

/**
 * Soft delete de categoria: Visible=FALSE. Rol ADMINISTRADOR.
 * @param {string} categoriaID
 * @param {string} email
 * @return {Object} {success, mensaje}
 */
function eliminarCategoria(categoriaID, email) {
  if (!_validarRolPermitido(email, ['ADMINISTRADOR'])) {
    return { success: false, mensaje: 'Solo el administrador puede eliminar categorias.' };
  }
  var hoja = _hoja(HOJAS.CATEGORIAS);
  var cats = _leerHojaComoObjetos(HOJAS.CATEGORIAS);
  for (var i = 0; i < cats.length; i++) {
    if (cats[i].ID === categoriaID) {
      hoja.getRange(cats[i]._fila, _indiceColumna(hoja, 'Visible') + 1).setValue('FALSE');
      registrarLog('Eliminar categoria (soft)', categoriaID, '');
      return { success: true, mensaje: 'Categoria ocultada.' };
    }
  }
  return { success: false, mensaje: 'Categoria no encontrada.' };
}

// ===========================================================================
// 6.9. HISTORIAL DE PEDIDOS
// ===========================================================================

/**
 * Busca pedidos historicos enriquecidos. Registra la consulta para auditoria.
 * NO genera comprobantes. Solo consulta interna.
 * @param {Object} filtros {habitacion, fechaDesde, fechaHasta, productoID, servicioID, usuarioConsulta}
 * @return {Array<Object>}
 */
function buscarHistorialPedidos(filtros) {
  filtros = filtros || {};

  var productos = {};
  _leerHojaComoObjetos(HOJAS.PRODUCTOS).forEach(function (p) {
    productos[p.ID] = _normalizarProducto(p);
  });
  var servicios = {};
  _leerHojaComoObjetos(HOJAS.SERVICIOS).forEach(function (s) {
    servicios[s.ID] = _normalizarServicio(s);
  });
  var reservas = {};
  _leerHojaComoObjetos(HOJAS.RESERVAS).forEach(function (r) {
    reservas[r.ID] = r;
  });

  // Agrupa detalles por pedido.
  var detallesPorPedido = {};
  _leerHojaComoObjetos(HOJAS.DETALLE_PEDIDOS).forEach(function (d) {
    if (!detallesPorPedido[d.PedidoID]) detallesPorPedido[d.PedidoID] = [];
    detallesPorPedido[d.PedidoID].push(d);
  });

  var resultados = _leerHojaComoObjetos(HOJAS.PEDIDOS).map(function (ped) {
    var reserva = reservas[ped.ReservaID] || {};
    var servicioID = reserva.ServicioID || '';
    var fecha = reserva.Fecha ? _fechaISO(reserva.Fecha) : _fechaISO(ped.Timestamp);
    var detalles = (detallesPorPedido[ped.ID] || []).map(function (d) {
      var prod = productos[d.ProductoID] || {};
      return {
        ProductoID: d.ProductoID,
        Nombre: prod.Nombre || d.ProductoID,
        Cantidad: Number(d.Cantidad) || 0,
        Subtotal: Number(d.Subtotal) || 0
      };
    });
    return {
      PedidoID: ped.ID,
      ReservaID: ped.ReservaID,
      Habitacion: String(ped.Habitacion),
      Fecha: fecha,
      ServicioID: servicioID,
      ServicioNombre: (servicios[servicioID] || {}).Nombre || servicioID,
      Estado: ped.Estado,
      Total: Number(ped.Total) || 0,
      Detalles: detalles,
      Resumen: detalles.map(function (d) { return d.Cantidad + 'x ' + d.Nombre; }).join(', ')
    };
  }).filter(function (r) {
    if (filtros.habitacion && String(r.Habitacion) !== String(filtros.habitacion)) return false;
    if (filtros.fechaDesde && r.Fecha < _fechaISO(filtros.fechaDesde)) return false;
    if (filtros.fechaHasta && r.Fecha > _fechaISO(filtros.fechaHasta)) return false;
    if (filtros.servicioID && r.ServicioID !== filtros.servicioID) return false;
    if (filtros.productoID) {
      var contiene = r.Detalles.some(function (d) { return d.ProductoID === filtros.productoID; });
      if (!contiene) return false;
    }
    return true;
  }).sort(function (a, b) { return a.Fecha < b.Fecha ? 1 : -1; });

  // Registra la consulta para auditoria.
  registrarConsultaHistorial({
    habitacion: filtros.habitacion || '',
    fechaReferencia: filtros.fechaDesde || '',
    servicioID: filtros.servicioID || '',
    tipoBusqueda: 'busqueda_historial',
    detalleResumen: 'Filtros: ' + JSON.stringify(filtros) + ' | Resultados: ' + resultados.length,
    pedidoID: '',
    reservaID: '',
    usuarioConsulta: filtros.usuarioConsulta || Session.getActiveUser().getEmail() || 'desconocido'
  });

  return resultados;
}

/**
 * Inserta una fila de auditoria en HistorialPedidos.
 * @param {Object} datos {habitacion, fechaReferencia, servicioID, tipoBusqueda,
 *   detalleResumen, pedidoID, reservaID, usuarioConsulta}
 * @return {Object} {success, id}
 */
function registrarConsultaHistorial(datos) {
  var id = generarID();
  _hoja(HOJAS.HISTORIAL).appendRow([
    id, new Date(), datos.habitacion || '', _fechaISO(datos.fechaReferencia || new Date()),
    datos.servicioID || '', datos.tipoBusqueda || '', datos.detalleResumen || '',
    datos.pedidoID || '', datos.reservaID || '', datos.usuarioConsulta || ''
  ]);
  return { success: true, id: id };
}

// ===========================================================================
// CONFIGURACION (edicion desde vista Staff)
// ===========================================================================

/**
 * Actualiza una clave de configuracion. Rol RECEPCION o ADMINISTRADOR.
 * @param {string} clave
 * @param {*} valor
 * @param {string} email
 * @return {Object} {success, mensaje}
 */
function actualizarConfiguracion(clave, valor, email) {
  if (!_validarRolPermitido(email, ['RECEPCION', 'ADMINISTRADOR'])) {
    return { success: false, mensaje: 'No tienes permisos para editar la configuracion.' };
  }
  var hoja = _hoja(HOJAS.CONFIGURACION);
  var filas = _leerHojaComoObjetos(HOJAS.CONFIGURACION);
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].Clave === clave) {
      hoja.getRange(filas[i]._fila, _indiceColumna(hoja, 'Valor') + 1).setValue(valor);
      registrarLog('Editar configuracion', clave + ' = ' + valor, '');
      return { success: true, mensaje: 'Configuracion actualizada.' };
    }
  }
  return { success: false, mensaje: 'Clave no encontrada.' };
}

// ===========================================================================
// GESTION DE PEDIDOS (vista Staff)
// ===========================================================================

/**
 * Devuelve los pedidos del dia con sus detalles (para cocina/recepcion).
 * @param {string} fecha
 * @return {Array<Object>}
 */
function obtenerPedidosDelDia(fecha) {
  fecha = _fechaISO(fecha || new Date());
  var reservas = {};
  _leerHojaComoObjetos(HOJAS.RESERVAS).forEach(function (r) { reservas[r.ID] = r; });
  var productos = {};
  _leerHojaComoObjetos(HOJAS.PRODUCTOS).forEach(function (p) { productos[p.ID] = _normalizarProducto(p); });

  var detallesPorPedido = {};
  _leerHojaComoObjetos(HOJAS.DETALLE_PEDIDOS).forEach(function (d) {
    if (!detallesPorPedido[d.PedidoID]) detallesPorPedido[d.PedidoID] = [];
    detallesPorPedido[d.PedidoID].push({
      Nombre: (productos[d.ProductoID] || {}).Nombre || d.ProductoID,
      Cantidad: Number(d.Cantidad) || 0,
      Subtotal: Number(d.Subtotal) || 0,
      Notas: d.Notas
    });
  });

  return _leerHojaComoObjetos(HOJAS.PEDIDOS).filter(function (ped) {
    var reserva = reservas[ped.ReservaID] || {};
    var fechaRef = reserva.Fecha ? _fechaISO(reserva.Fecha) : _fechaISO(ped.Timestamp);
    return fechaRef === fecha;
  }).map(function (ped) {
    var reserva = reservas[ped.ReservaID] || {};
    return {
      ID: ped.ID,
      Habitacion: String(ped.Habitacion),
      Estado: ped.Estado,
      Total: Number(ped.Total) || 0,
      Notas: ped.Notas,
      HoraReserva: reserva.HoraInicio || '',
      Detalles: detallesPorPedido[ped.ID] || []
    };
  });
}

// ===========================================================================
// 6.10. SEGURIDAD Y UTILIDADES
// ===========================================================================

/**
 * Verifica que un email tenga un rol determinado y este activo.
 * @param {string} email
 * @param {string} rolRequerido
 * @return {boolean}
 */
function validarRol(email, rolRequerido) {
  if (!email) return false;
  var usuarios = _leerHojaComoObjetos(HOJAS.USUARIOS);
  for (var i = 0; i < usuarios.length; i++) {
    if (String(usuarios[i].Email).toLowerCase() === String(email).toLowerCase()) {
      return _aBooleano(usuarios[i].Activo) && usuarios[i].Rol === rolRequerido;
    }
  }
  return false;
}

/** Devuelve el usuario (o null) por email, validando que este activo. */
function obtenerUsuarioPorEmail(email) {
  if (!email) return null;
  var usuarios = _leerHojaComoObjetos(HOJAS.USUARIOS);
  for (var i = 0; i < usuarios.length; i++) {
    if (String(usuarios[i].Email).toLowerCase() === String(email).toLowerCase() &&
        _aBooleano(usuarios[i].Activo)) {
      return {
        ID: usuarios[i].ID,
        Email: usuarios[i].Email,
        Nombre: usuarios[i].Nombre,
        Rol: usuarios[i].Rol,
        HabitacionAsociada: usuarios[i].HabitacionAsociada
      };
    }
  }
  return null;
}

/**
 * Login de staff: valida email contra la hoja Usuarios.
 * @param {string} email
 * @return {Object} {success, usuario, mensaje}
 */
function autenticarStaff(email) {
  var usuario = obtenerUsuarioPorEmail(email);
  if (!usuario) return { success: false, mensaje: 'Usuario no encontrado o inactivo.' };
  registrarLog('Login staff', usuario.Rol, '');
  return { success: true, usuario: usuario, mensaje: 'Bienvenido ' + usuario.Nombre };
}

/** Valida que el email pertenezca a alguno de los roles indicados. */
function _validarRolPermitido(email, roles) {
  var usuario = obtenerUsuarioPorEmail(email);
  if (!usuario) return false;
  return roles.indexOf(usuario.Rol) !== -1;
}

/**
 * Genera un UUID simple.
 * @return {string}
 */
function generarID() {
  return Utilities.getUuid();
}

/**
 * Formatea un valor numerico como moneda usando MONEDA_SIMBOLO.
 * @param {number} valor
 * @return {string}
 */
function formatearMoneda(valor) {
  var simbolo = _obtenerConfigValor('MONEDA_SIMBOLO') || '$';
  var n = Number(valor) || 0;
  // Separador de miles con punto (formato CLP).
  var entero = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return simbolo + entero;
}

/**
 * Inserta una entrada en LogActividad.
 * @param {string} accion
 * @param {string} detalle
 * @param {string} habitacion
 */
function registrarLog(accion, detalle, habitacion) {
  try {
    var email = '';
    try { email = Session.getActiveUser().getEmail() || ''; } catch (e) { email = ''; }
    _hoja(HOJAS.LOG).appendRow([
      generarID(), new Date(), email, accion, detalle || '', habitacion || ''
    ]);
  } catch (err) {
    // El log nunca debe romper el flujo principal.
  }
}
