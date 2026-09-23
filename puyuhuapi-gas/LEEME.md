# Rumbo · Puyuhuapi Lodge (Google Apps Script)

Herramienta para organizar las excursiones, los guías, los turnos y días libres, los huéspedes, los implementos y los vehículos.
Los datos se guardan en una Planilla de Google. La app se abre desde el Mac o el celular con un enlace.

## Instalación (una sola vez, ~5 minutos)

1. Entra a https://sheets.new para crear una Planilla nueva. Ponle un nombre, por ejemplo "Rumbo Puyuhuapi".
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

**PIN iniciales:** jefe `1234` · Guía 1 `1111` · Guía 2 `2222`.
Cámbialos en la pestaña **Guías** y pon los nombres reales.

> Nadie entra sin PIN: la app pide nombre y PIN antes de mostrar cualquier dato.

## Cuando cambies el código más adelante

Pega el código nuevo y luego ve a **Implementar › Gestionar implementaciones › ✏️ editar › Versión: Nueva versión › Implementar**.
Así la URL sigue siendo la misma. Tus datos no se pierden: viven en la Planilla, no en el código.

## Qué hace

| Pestaña | Para qué |
|---|---|
| **Día** | Programa del día: turno de cada guía, excursiones, alertas, implementos en uso y huéspedes que llegan o salen. Botón para mandarlo por WhatsApp. |
| **Semana y turnos** | Grilla de guías por día. Toca una celda para asignar el turno o el día libre (o toda la semana de una vez). Muestra horas y libres por guía, e incluye "Copiar turnos de la semana anterior". |
| **Excursiones** | Lista filtrable por fechas, guía, estado o texto. |
| **Huéspedes** | Ficha de cada huésped: habitación, fechas, pax, idioma, restricciones alimentarias, salud y tallas. |
| **Actividades** | Catálogo editable: duración, dificultad, capacidad, vehículo por defecto, implementos por pasajero y checklist de preparación. |
| **Equipo** | Stock de implementos y vehículos o botes, con el uso del día. |
| **Guías** (solo jefe) | Guías, PIN, tipos de turno (Mañana, Tarde, Libre, Vacaciones…) y configuración. |

**Alertas automáticas al programar una excursión:**
- guía en su día libre, sin turno o fuera de su horario;
- guía o vehículo ya ocupado en otra excursión a la misma hora;
- implementos insuficientes, sumando las excursiones que coinciden en horario;
- más pasajeros que la capacidad de la actividad o del vehículo;
- huésped que no está alojado en esa fecha.

**Permisos:**
- El jefe puede editar y eliminar todo.
- Los guías ven todo, y pueden crear y editar excursiones y fichas de huéspedes: marcar el checklist, cambiar el estado, agregar notas.
- Los guías no pueden eliminar, ni tocar turnos, guías, catálogo o equipo.

**Primeros ajustes recomendados:**
- En **Equipo**, pon las cantidades reales de implementos: las que trae son de referencia.
- En **Equipo**, agrega la capacidad de la van y del bote Newen.
- En **Actividades**, revisa los implementos por pax y la capacidad máxima de cada actividad.

**Respaldo:** los datos quedan en las hojas de la Planilla. Para respaldar, usa **Archivo › Hacer una copia** o descarga en Excel.
Puedes mirar las hojas, pero conviene editar desde la app.
