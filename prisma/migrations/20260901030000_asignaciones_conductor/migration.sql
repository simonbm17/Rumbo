-- ===========================================================================
-- Historial de asignaciones conductor–vehículo
--
-- No altera ni borra nada existente: crea una tabla, dos enums y reconstruye
-- el estado actual desde Truck.currentDriverId. Truck queda intacto, así que
-- revertir es DROP TABLE y la aplicación vuelve al comportamiento de hoy.
--
-- Escrita a mano: Prisma no sabe expresar índices parciales ni CHECK. Los
-- objetos de los bloques 4 y 5 no están representados en schema.prisma; si una
-- migración futura los borra, hay que volver a crearlos.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 0. Guardia previa (decisión D, aprobada)
--
--    Si algún conductor figura como currentDriverId de más de un vehículo, la
--    unicidad activa por conductor lo rechazaría a mitad del backfill. Se
--    aborta antes, con un mensaje que dice qué hacer.
--
--    NO se resuelve por algoritmo: la reconciliación es humana y se hace en la
--    aplicación antes de correr esto sobre datos reales.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  conflictos INT;
  detalle    TEXT;
BEGIN
  SELECT count(*), string_agg(nombre, '; ')
    INTO conflictos, detalle
  FROM (
    SELECT d."firstName" || ' ' || d."lastName" || ' → ' ||
           string_agg(t.plate, ', ' ORDER BY t.plate) AS nombre
    FROM "Truck" t
    JOIN "Driver" d ON d.id = t."currentDriverId"
    GROUP BY d.id, d."firstName", d."lastName"
    HAVING count(*) > 1
  ) c;

  IF conflictos > 0 THEN
    RAISE EXCEPTION
      'Migración abortada: % conductor(es) están asignados a más de un vehículo (%). Reconciliá esas asignaciones en la aplicación antes de migrar. No se resuelve automáticamente.',
      conflictos, detalle;
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
CREATE TYPE "AssignmentSource" AS ENUM ('MANUAL', 'MIGRATION');

CREATE TYPE "AssignmentEndReason" AS ENUM ('REASSIGNED', 'RELEASED', 'ARCHIVED', 'CANCELLED');


-- ---------------------------------------------------------------------------
-- 2. Tabla
-- ---------------------------------------------------------------------------
CREATE TABLE "DriverAssignment" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endReason" "AssignmentEndReason",
    "source" "AssignmentSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdById" TEXT,
    "endedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverAssignment_pkey" PRIMARY KEY ("id")
);


-- ---------------------------------------------------------------------------
-- 3. Claves foráneas
--
--    RESTRICT hacia Truck y Driver: ARCHIVAR > BORRAR. Un vehículo o conductor
--    con historial no se puede eliminar físicamente.
--    SET NULL hacia User: si se borra el usuario se pierde el nombre de quien
--    hizo la operación, nunca el hecho de que ocurrió.
-- ---------------------------------------------------------------------------
ALTER TABLE "DriverAssignment" ADD CONSTRAINT "DriverAssignment_truckId_fkey"
    FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DriverAssignment" ADD CONSTRAINT "DriverAssignment_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DriverAssignment" ADD CONSTRAINT "DriverAssignment_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DriverAssignment" ADD CONSTRAINT "DriverAssignment_endedById_fkey"
    FOREIGN KEY ("endedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- 4. Índices
--
--    PostgreSQL no indexa las claves foráneas por su cuenta. Estos dos las
--    cubren como columna principal y además ordenan el historial por fecha.
-- ---------------------------------------------------------------------------
CREATE INDEX "DriverAssignment_truckId_startedAt_idx"
    ON "DriverAssignment"("truckId", "startedAt");

CREATE INDEX "DriverAssignment_driverId_startedAt_idx"
    ON "DriverAssignment"("driverId", "startedAt");


-- ---------------------------------------------------------------------------
-- 5. Cardinalidad activa, garantizada por la base
--
--    El predicado es solo `endedAt IS NULL` porque el modelo no tiene columna
--    de estado. Con una, una fila incoherente (estado cerrado pero endedAt
--    nulo) se escaparía del índice y habría dos vigentes sin que nadie avise.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "asignacion_activa_unica_por_vehiculo"
    ON "DriverAssignment" ("truckId")
    WHERE "endedAt" IS NULL;

CREATE UNIQUE INDEX "asignacion_activa_unica_por_conductor"
    ON "DriverAssignment" ("driverId")
    WHERE "endedAt" IS NULL;


-- ---------------------------------------------------------------------------
-- 6. Invariantes del dominio
-- ---------------------------------------------------------------------------

-- Cierre coherente: o vigente sin motivo, o cerrada con motivo. Impide
-- exactamente los dos casos contradictorios: endedAt sin motivo, y motivo sin
-- endedAt.
ALTER TABLE "DriverAssignment" ADD CONSTRAINT "chk_asignacion_cierre_coherente"
    CHECK (("endedAt" IS NULL) = ("endReason" IS NULL));

-- No se puede cerrar antes de empezar.
ALTER TABLE "DriverAssignment" ADD CONSTRAINT "chk_asignacion_orden_fechas"
    CHECK ("startedAt" IS NULL OR "endedAt" IS NULL OR "endedAt" >= "startedAt");

-- Solo una fila migrada puede no tener fecha de inicio. Sube a la base la
-- regla de que ninguna asignación nueva se cree sin fecha.
ALTER TABLE "DriverAssignment" ADD CONSTRAINT "chk_asignacion_inicio_obligatorio"
    CHECK ("source" = 'MIGRATION' OR "startedAt" IS NOT NULL);


-- ---------------------------------------------------------------------------
-- 7. Backfill desde Truck.currentDriverId
--
--    startedAt queda en NULL a propósito: la fecha real de asignación no
--    existe en ningún lado y Truck.updatedAt corresponde a cualquier edición
--    del vehículo, no a la asignación. Un hueco explícito es mejor que un dato
--    falso que después nadie sepa distinguir.
--
--    El prefijo `mig_` y source = 'MIGRATION' hacen que estas filas sean
--    reconocibles sin leer el texto de `notes`.
-- ---------------------------------------------------------------------------
INSERT INTO "DriverAssignment"
    ("id", "truckId", "driverId", "startedAt", "endedAt", "endReason",
     "source", "notes", "createdAt", "updatedAt")
SELECT
    'mig_' || replace(gen_random_uuid()::text, '-', ''),
    t."id",
    t."currentDriverId",
    NULL,
    NULL,
    NULL,
    'MIGRATION',
    'Reconstruida desde Truck.currentDriverId al migrar. La fecha original de asignación no está disponible.',
    now(),
    now()
FROM "Truck" t
WHERE t."currentDriverId" IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 8. Verificación posterior
--
--    Comprueba la invariante de proyección antes de dar la migración por
--    buena. Si algo no cuadra, revierte todo en lugar de dejar la caché y el
--    historial diciendo cosas distintas.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  desajustes INT;
BEGIN
  SELECT count(*) INTO desajustes
  FROM "Truck" t
  LEFT JOIN "DriverAssignment" a
         ON a."truckId" = t.id AND a."endedAt" IS NULL
  WHERE t."currentDriverId" IS DISTINCT FROM a."driverId";

  IF desajustes > 0 THEN
    RAISE EXCEPTION
      'Migración abortada: % vehículo(s) quedaron con currentDriverId distinto de su asignación vigente.',
      desajustes;
  END IF;
END $$;
