---
trigger: always_on
---

# Reglas de Base de Datos y Optimización en Producción (MongoDB + Mongoose)

## Estrategia de Índices
Para garantizar consultas de baja latencia ($O(\log N)$) y evitar escaneos completos de colecciones (`COLLSCAN`), todo modelo de Mongoose debe seguir las siguientes pautas de indexación:

1. **Campos Únicos e Identificadores:**
   - Todo campo de búsqueda por ID externo o usuario (`clerkId`, `username`, `email`) debe tener `unique: true` o `index: true`.
   - Si un campo único puede ser nulo o no existir en todos los documentos, usar `sparse: true`.

2. **Índices Geoespaciales:**
   - Para coordenadas de eventos y ubicaciones en el radar, usar siempre un índice `2dsphere`:
     `eventSchema.index({ "location.coordinates": "2dsphere" });`

3. **Índices Compuestos y la Regla ESR (Equality, Sort, Range):**
   - El orden de los campos en índices compuestos debe estructurarse según:
     1. **Equality** (Filtros de coincidencia exacta, ej: `status: "active"`).
     2. **Sort** (Campos de ordenamiento, ej: `startAt: 1` o `createdAt: -1`).
     3. **Range** (Filtros de rango numérico o fecha).
   - Ejemplo en eventos:
     - `eventSchema.index({ status: 1, startAt: 1 });` (Feed principal).
     - `eventSchema.index({ status: 1, category: 1, startAt: 1 });` (Filtro por categoría).
     - `eventSchema.index({ organizer: 1, createdAt: -1 });` (Mis eventos organizados).
     - `eventSchema.index({ "attendees.user": 1 });` (Mis asistencias).

4. **Prevención de Sobrecarga de Escritura:**
   - No crear índices para campos de baja cardinalidad que no se combinen en consultas compuestas ni campos que se modifiquen con demasiada frecuencia.
   - Auditar planes de ejecución periódicamente con `.explain("executionStats")` para verificar `IXSCAN`.
