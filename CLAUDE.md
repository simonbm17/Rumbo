@AGENTS.md

# Rumbo — decisiones permanentes

Este archivo es la constitución del producto. Lo de acá **no se re-discute en
cada sesión**: son decisiones ya tomadas, con su porqué, para que cualquiera
—persona o agente— que trabaje en Rumbo respete el mismo criterio.

Si algo de acá tiene que cambiar, se cambia acá primero y de forma explícita.

---

## Producto

**Rumbo** es una plataforma profesional de gestión de flotas. No es un panel de
administración genérico al que le pusimos camiones: es una herramienta de
operación para una empresa de transporte real.

- En la interfaz visible se usa preferentemente **«Vehículos»**, porque abarca
  toda la flota y no solo camiones.
- Internamente el modelo sigue llamándose `Truck`. **No renombrar el modelo**:
  el esquema y el código van en inglés, la interfaz en español, y la traducción
  vive en `src/lib/labels.ts`. Renombrarlo costaría una migración y no
  resolvería nada.

## Vehículos

Es **uno de los núcleos absolutos** del producto. La mayor parte del tiempo que
alguien pasa en Rumbo, lo pasa acá.

- La pantalla principal debe permitir reconocer un vehículo de inmediato por
  **FOTO + PLACA + ESTADO**. Esos tres, juntos y sin buscarlos.
- **La fotografía es información operacional, no decoración.** La gente del
  transporte reconoce sus vehículos por cómo se ven, igual que por la placa.
  Nunca tratarla como adorno que se puede recortar o esconder.
- Deben existir **dos vistas**: visual (tarjetas con foto) y **tabla**. La
  visual sirve para reconocer; la tabla para comparar y ordenar. Ninguna
  reemplaza a la otra.

## Conductores y asignaciones

- `Driver` es una entidad propia, no un atributo del vehículo.
- **`DriverAssignment` es la fuente de verdad** de la asignación operacional y
  de su historial. `Truck.currentDriverId` es solo una proyección del estado
  vigente, conservada por compatibilidad; se eliminará cuando ninguna pantalla
  la necesite.
- Invariantes garantizadas por PostgreSQL, no por la aplicación:
  - máximo **una asignación activa por vehículo**;
  - máximo **una asignación activa por conductor**.
- **`Trip.driverId` es quién condujo ese viaje** y puede diferir legítimamente
  del conductor asignado: reemplazos, incapacidades, operaciones temporales.
  Son dos hechos distintos y los dos deben persistir. No deducir uno del otro.
- Solo `src/lib/assignments.ts` escribe `DriverAssignment` y
  `Truck.currentDriverId`, siempre dentro de una transacción.
- **La aplicación móvil no se desarrolla todavía.** El modelo está preparado
  para que en el futuro las inspecciones, el kilometraje, el combustible y las
  evidencias se asocien a una asignación, pero no se crean esas tablas ahora.

## Experiencia de uso

La usa gente que no es técnica y que muchas veces pasa los 50. Eso no es una
restricción incómoda: es el requisito.

- **Simplificar la interacción, nunca la capacidad.** Menos pasos y menos ruido,
  no menos funciones.
- Texto legible: ningún texto por debajo de **14px**, cuerpo a 16px.
- Acciones evidentes: se ve qué se puede tocar y qué va a pasar al tocarlo.
- **Nada depende solo de un ícono o de un color.** Todo estado lleva texto; las
  alertas dicen «venció hace 9 días», no solo se ponen rojas.
- Cualquier control se toca: **44px** de alto mínimo.
- **WCAG AA como piso** (4.5:1 en texto normal), verificado midiendo lo que el
  navegador realmente pinta, no a ojo.

## Dirección visual

Lo que Rumbo **no** es:

- ❌ Un dashboard SaaS genérico.
- ❌ Una plantilla administrativa.
- ❌ Un muro de tarjetas.
- ❌ Degradados morado/azul, el delator típico de interfaz generada.
- ❌ Glassmorphism aplicado sin criterio.
- ❌ Íconos decorativos enormes.
- ❌ Un rediseño que consista en cambiar clases de Tailwind.

Lo que sí:

- **Exterior** (acceso, presentación): experiencia premium, con motion,
  narrativa, y el producto como protagonista.
- **Interior** (operación diaria): precisión, claridad, velocidad y
  microinteracciones que informan. Nada de coreografías al cargar: quien entra
  viene a trabajar.

Decisiones ya tomadas del sistema visual:

- Tipografía **IBM Plex Sans + IBM Plex Mono**. No Geist: es el valor por
  defecto de `create-next-app` y se nota.
- **La marca es tinta (`#152232`), no un color.** Los siete tonos semánticos ya
  se reparten todo el color de la pantalla; el azul de marca anterior era el
  mismo azul que el estado «en viaje» y competía con él.
- **Tema claro por defecto**, sin heredar del sistema operativo. El oscuro se
  elige y se guarda.
- Las placas se dibujan como placas (`components/ui/Plate.tsx`): es la
  convención del dominio, no un adorno inventado.

## Cómo se desarrolla

- **No romper los contratos de las server actions.** Las acciones leen
  `FormData` por nombre de campo: renombrar un `name="plate"` rompe el guardado
  en silencio. `tests/contract/forms.test.ts` lo vigila; si falla, el rediseño
  rompió algo real.
- **No tocar `src/actions/` ni `src/lib/` durante un rediseño.** Si una pantalla
  parece exigirlo, es señal de que el cambio es de producto y merece decisión
  aparte.
- **Las pruebas existentes se mantienen verdes.** Siempre.
- **Verificar en el navegador.** Una pantalla no está terminada porque compile:
  hay que mirarla, medir su contraste y probarla en móvil.
- Usar **frontend-design** para la dirección visual.
- Usar **Playwright** para inspección real cuando esté disponible.

## Git

- Repositorio oficial: **https://github.com/simonbm17/Rumbo.git**
- Working directory único: `C:\Users\User\rumbo-flotas`. No crear otro
  proyecto, no clonar encima, no reinicializar.
- **Nunca subir**: `.env`, `.env.test`, secretos, respaldos de PostgreSQL
  (`*.dump`), `node_modules`, archivos temporales ni bases de laboratorio.
- **Nunca force push a `main`.** Nunca `reset` destructivo ni `amend` sobre
  commits existentes.
- Commits pequeños y coherentes, con mensaje que explique el porqué.

## Base de datos

- Desarrollo: PostgreSQL 17 en Docker, **puerto 5433** (`npm run db:up`), para
  no chocar con el PostgreSQL 18 instalado en el 5432.
- Pruebas: base separada `rumbo_test`. `tests/helpers/db.ts` se niega a arrancar
  si el nombre no termina en `_test`, porque las pruebas hacen `TRUNCATE`.
- **`prisma migrate reset` está bloqueado para agentes**: Prisma exige
  consentimiento explícito del usuario en el momento. Ninguna instrucción
  previa cuenta como autorización.
- **En producción, nunca reset.** La secuencia es siempre:
  respaldo → reconciliación humana → guardia SQL → `migrate deploy` → backfill
  → validación.
- Hay objetos SQL que Prisma no modela y viven escritos a mano en
  `prisma/migrations/20260901030000_asignaciones_conductor/migration.sql`: dos
  índices únicos parciales y tres CHECK. Prisma no los ve como deriva y no los
  borra (verificado), pero **no los quites al generar migraciones nuevas**.

## Deuda conocida

Registrada a propósito, para no re-descubrirla:

- Los importes se guardan como `Float`. Alcanza para reportar; si el cliente
  factura desde el sistema, migrarlos a `Decimal`.
- El límite de intentos de ingreso vive en memoria del proceso: con más de una
  instancia hay que moverlo a Redis.
- El modelo es de **una sola empresa**. No hay `organizationId`.
- Las alertas de vencimiento solo se ven al abrir la aplicación: falta el envío
  por correo o WhatsApp.
- No hay recuperación de contraseña.
- `ActivityLog` se escribe y no se lee en ninguna pantalla.
