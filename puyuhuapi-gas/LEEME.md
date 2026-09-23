# Puyuhuapi Lodge · Animaciones (Google Apps Script)

Herramienta para organizar las excursiones, los guías, los turnos y días libres, los huéspedes, los implementos, los vehículos y los informes.
Los datos se guardan en una Planilla de Google. La app se abre desde el Mac o el celular con un enlace.

## Instalación (una sola vez, ~5 minutos)

> Si prefieres crear el proyecto directamente en script.google.com, también funciona: al ejecutar `configurar` se crea sola la Planilla **"Puyuhuapi Lodge - Datos"** en tu Drive. El enlace aparece en el Registro de ejecución.

1. Entra a https://sheets.new para crear una Planilla nueva. Ponle un nombre, por ejemplo "Puyuhuapi Animaciones".
2. En la Planilla, abre el menú **Extensiones › Apps Script**.
3. Pega el archivo **Code.gs**:
   borra todo lo que hay en `Código.gs` y pega el contenido completo de `Code.gs`.
4. Agrega el archivo **Index.html**:
   toca el **+** junto a "Archivos", elige **HTML** y ponle de nombre exactamente `Index`
   (el editor agrega el `.html`). Borra lo que trae y pega el contenido completo de `Index.html`.
5. Guarda con ⌘S.
6. Elige la función **configurar** en la lista desplegable de arriba y toca **▶ Ejecutar**.
   Google pide permisos: *Revisar permisos › tu cuenta › Configuración avanzada › Ir a (no seguro) › Permitir*.
   Aparece "no seguro" porque el script es tuyo y Google no lo ha verificado. Es normal.
   Al terminar, la Planilla tiene sus hojas y viene cargada con las 14 actividades de la carta.
7. Toca **Implementar › Nueva implementación**, pulsa el engranaje y elige **App web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   - Toca **Implementar** y copia la **URL de la app web**.
8. Abre esa URL. Guárdala en favoritos del Mac y en la pantalla de inicio del celular
   (Safari › Compartir › Agregar a inicio). Mándasela a los guías.

**PIN iniciales:** Matias Abarca `1234` (acceso completo) · Guía 1 `1111` · Guía 2 `2222`.
Cámbialos en la pestaña **Guías** y pon los nombres reales. Todos aparecen igual en la app; el acceso completo solo se nota en que esa persona ve las pestañas Informes y Guías.

> Nadie entra sin PIN: la app pide nombre y PIN antes de mostrar cualquier dato.

## Cuando cambies el código más adelante

Si el código nuevo pide permisos nuevos (por ejemplo Google Drive o "conectarse a un servicio externo", que se usan para los PDF), primero ejecuta `configurar` una vez en el editor y acepta los permisos.

Pega el código nuevo y luego ve a **Implementar › Gestionar implementaciones › ✏️ editar › Versión: Nueva versión › Implementar**.
Así la URL sigue siendo la misma. Tus datos no se pierden: viven en la Planilla, no en el código.

## Qué hace

| Pestaña | Para qué |
|---|---|
| **Día** | Programa del día: turno de cada guía, excursiones, alertas, implementos en uso y huéspedes que llegan o salen. Botón para mandarlo por WhatsApp. |
| **Turnos** | Vista **Semana** o **Mes**. Toca una celda para asignar un turno, o **arrastra** sobre varias celdas (⌘/Ctrl + clic suma celdas sueltas; en el celular, "Seleccionar varios") y elige el turno para todas de una vez. **📄 PDF** genera una hoja horizontal con colores, leyenda y totales, lista para imprimir (sin horas trabajadas: muestra días trabajados y libres). |
| **Excursiones** | Calendario **Día** o **Semana** con horas: cada actividad es una burbuja del largo de su duración, y las simultáneas quedan lado a lado. Toca un espacio vacío para crear una excursión a esa hora. También hay una vista **Lista** con filtros. |
| **Huéspedes** | Buscador de los huéspedes que han tomado actividades. Se llena solo: al escribir un pasajero nuevo en una excursión, se crea su ficha. Filtra por nombre, habitación, fechas o actividad; cada ficha muestra su historial, restricciones y tallas. |
| **Actividades** | Catálogo editable: duración, dificultad, capacidad, vehículo por defecto, implementos por pasajero y checklist de preparación. |
| **Equipo** | Stock de implementos y vehículos o botes, con el uso del día. |
| **Informes** (solo jefe) | Elige un rango de fechas (y, si quieres, de horario, guía o actividad) y las secciones: resumen, por actividad, por guía, por categoría, por fecha, por horario, huéspedes frecuentes y detalle. **Generar PDF** lo guarda en Drive (carpeta "Informes Puyuhuapi Lodge") y permite descargarlo. |
| **Guías** (solo jefe) | Guías, PIN, tipos de turno (Mañana, Tarde, Libre, Vacaciones…) y configuración. |

**Alertas automáticas al programar una excursión:**
- guía en su día libre, sin turno o fuera de su horario;
- guía o vehículo ya ocupado en otra excursión a la misma hora;
- implementos insuficientes, sumando las excursiones que coinciden en horario;
- más pasajeros que la capacidad de la actividad o del vehículo;
- huésped que no está alojado en esa fecha.

**Permisos:**
- Quien tiene acceso **Completo** puede editar y eliminar todo, y ver informes. Se asigna en la pestaña Guías.
- Los guías ven las pestañas Día, Turnos, Excursiones y Actividades. Pueden crear y editar excursiones (con sus pasajeros): marcar el checklist, cambiar el estado, agregar notas.
- Los guías no ven Huéspedes, Equipo, Informes ni Guías, ni los botones de WhatsApp, imprimir o PDF. No pueden eliminar ni tocar turnos.

**Primeros ajustes recomendados:**
- En **Equipo**, pon las cantidades reales de implementos: las que trae son de referencia.
- En **Equipo**, agrega la capacidad de la van y del bote Newen.
- En **Actividades**, revisa los implementos por pax y la capacidad máxima de cada actividad.

**Respaldo:** los datos quedan en las hojas de la Planilla. Para respaldar, usa **Archivo › Hacer una copia** o descarga en Excel.
Puedes mirar las hojas, pero conviene editar desde la app.
