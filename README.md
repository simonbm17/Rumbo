# Rumbo — Sistema de gestión de flotas

Aplicación web para que el dueño o administrador de una flota de camiones lleve
todo en un solo lugar: vehículos con foto y placa, viajes, cargas, conductores,
clientes, mantenimiento, gastos, documentos con alertas de vencimiento y
reportes de rentabilidad.

Funciona en computador, tablet y celular desde el navegador.

---

## Requisitos

- **Node.js 20 o superior** (probado con 24)
- **Docker Desktop** (solo para la base de datos de desarrollo) o cualquier
  PostgreSQL 14+ accesible

## Puesta en marcha

```bash
npm install
```

```bash
npm run db:up
```

Levanta PostgreSQL en el puerto **5433** con Docker. Si preferís usar tu propio
PostgreSQL, saltá este paso y cambiá `DATABASE_URL` en `.env`.

```bash
npm run db:migrate
```

Crea las tablas.

```bash
npm run db:seed
```

Carga datos de demostración: 6 camiones, 5 conductores, 6 clientes y más de 100
viajes con sus cargas, gastos y documentos. **Ojo: borra todo lo que haya.**

```bash
npm run dev
```

Abrí <http://localhost:3000>.

### Usuarios de la demo

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@rumbo.app` | `Admin1234` |
| Operador | `operaciones@rumbo.app` | `Operador1234` |
| Solo lectura | `contabilidad@rumbo.app` | `Consulta1234` |

Cambiá estas contraseñas antes de mostrarle el sistema al cliente, y las claves
del administrador antes de publicarlo.

---

## Qué incluye

### Camiones
Ficha completa por vehículo con foto, placa, datos técnicos y estado
(disponible / en viaje / en taller / fuera de servicio). Al entrar a un camión
se ve todo lo suyo en pestañas: resumen financiero, viajes, mantenimientos,
gastos y documentos. Calcula ingresos, egresos, utilidad, margen, costo por
kilómetro y rendimiento de combustible (km/L).

### Viajes y cargas
Código correlativo automático (V-0001, V-0002…), ruta, fechas, odómetros,
distancia y valor del flete. Cada viaje lleva sus cargas (qué se transporta,
para qué cliente, peso, valor declarado) y sus gastos, con la utilidad del
viaje calculada.

Al marcar un viaje **en curso**, el camión y el conductor pasan a ese estado
solos; al completarlo se liberan y el odómetro del camión se actualiza.

### Conductores
Datos personales, licencia con vencimiento, contacto de emergencia, camiones
asignados, historial de viajes y documentos propios.

### Clientes
Empresas a las que se les transporta, con el historial de cargas y lo facturado
a cada una.

### Mantenimiento
Preventivos, correctivos y revisiones con costo, taller, factura y kilometraje.
Se puede programar el próximo servicio por fecha o por kilómetros, y eso genera
una alerta.

### Gastos
Combustible (con litros, precio unitario y cálculo automático del total),
peajes, viáticos, hospedaje, multas, seguros y más. Se pueden asociar a un
camión, a un viaje y a un conductor, y adjuntar el comprobante.

### Documentos y alertas
SOAT, tecnomecánica, pólizas, tarjetas de operación, licencias y exámenes
médicos. El sistema avisa **30 días antes** del vencimiento y marca en rojo lo
vencido. El contador de alertas aparece en el menú lateral.

### Reportes
Evolución mensual de ingresos contra egresos, distribución de gastos por
categoría, rentabilidad comparada de cada camión y las rutas más rentables.
Se imprime a PDF desde el navegador.

### Usuarios y permisos

| Rol | Puede |
| --- | --- |
| **Administrador** | Todo, incluyendo usuarios y datos de la empresa |
| **Operador** | Crear y editar camiones, viajes, cargas, gastos y documentos |
| **Solo lectura** | Únicamente consultar |

Los permisos se validan en el servidor dentro de cada acción, no solo
escondiendo botones.

---

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm start` | Sirve la compilación de producción |
| `npm run lint` | Revisa el código |
| `npm run db:up` / `db:down` | Levanta o apaga PostgreSQL en Docker |
| `npm run db:migrate` | Aplica cambios del esquema en desarrollo |
| `npm run db:deploy` | Aplica migraciones en producción |
| `npm run db:seed` | Recarga los datos de demostración |
| `npm run db:studio` | Explorador visual de la base de datos |
| `npm run db:reset` | Borra y recrea la base desde cero |

---

## Seguridad

Lo que está implementado y por qué. Si tocás alguna de estas piezas, sabé qué
estás desactivando.

| Control | Dónde | Qué cubre |
| --- | --- | --- |
| Contraseñas con bcrypt (coste 12) | `lib/auth.ts` | Robo de la base de datos |
| Sesión JWT firmada en cookie `httpOnly`, `SameSite=Lax`, `secure` en producción | `lib/auth.ts` | Robo de sesión por JavaScript y CSRF |
| Verificación del usuario en base en **cada** petición | `requireUser()` | Desactivar una cuenta corta el acceso al instante, sin esperar a que expire el token |
| Permisos revalidados dentro de cada server action | `actions/*` | Que esconder un botón no sea la única defensa |
| Límite de intentos de ingreso | `lib/rate-limit.ts` | Ataque de diccionario contra una cuenta |
| Respuesta de duración constante en el login | `actions/auth.ts` | Enumerar qué correos existen midiendo el tiempo de respuesta |
| CSP con nonce por petición | `middleware.ts` | Ejecución de scripts inyectados |
| `nosniff`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy` | `middleware.ts` | Confusión de tipo MIME, clickjacking, fuga de referer |
| Validación de los bytes reales del archivo subido | `lib/storage.ts` | Que un ejecutable llegue disfrazado de imagen |
| Nombre de archivo aleatorio y carpeta saneada | `lib/storage.ts` | Escritura fuera del directorio de subidas |
| Consultas parametrizadas (Prisma, sin SQL crudo) | todo el proyecto | Inyección SQL |

**Límites conocidos, a resolver antes de escalar:**

- El límite de intentos vive en memoria del proceso. Con más de una instancia
  detrás de un balanceador, cada una lleva su propia cuenta. Mover a Redis.
- El modelo es de **una sola empresa**. Cualquier usuario autenticado ve toda la
  flota; no hay separación por organización. Si se vende a varias empresas hay
  que agregar `organizationId` a cada tabla y filtrar en cada consulta.
- Cambiar la contraseña cierra la sesión actual, pero no las que esa persona
  tenga abiertas en otros dispositivos.
- `npm audit` reporta `deepmerge-ts` a través de `@prisma/config`. Es una
  dependencia del CLI de Prisma: no entra en el código que corre en producción.

## Criterios de la interfaz

La pantalla la usa gente que no es técnica y que muchas veces pasa los 50. Todo
lo visual sale de estas reglas; si vas a tocar el diseño, respetalas.

1. **La tipografía es IBM Plex**, no la que trae Next por defecto. Sans y Mono
   son la misma familia: las placas, los códigos de viaje y las facturas van en
   monoespaciada y eso es parte del sistema, no otra fuente.
2. **Ningún texto baja de 14px**, el cuerpo es de 16px y las cifras van a 28–40px.
   La escala está fija en `globals.css` y no es fluida: en una herramienta de
   trabajo el texto no debe encogerse al angostar la ventana.
3. **Todo par de color cumple AA (4.5:1)**, verificado midiendo lo que el
   navegador realmente pinta, no a ojo. Antes había un tercer nivel de texto
   "tenue" que quedaba en 2.3:1; se eliminó. Quedan dos: `--text` y
   `--text-muted`, más `--icon-muted` solo para íconos decorativos.
4. **Nada depende solo del color.** Cada estado lleva texto además del tono, y
   las alertas dicen "venció hace 9 días" en palabras, no solo en rojo.
5. **Cualquier cosa que se toca mide 44px de alto.** Botones, campos,
   filtros y elementos del menú.
6. **Sin degradados ni vidrio esmerilado.** Colores planos. El único
   `linear-gradient` del proyecto dibuja la flecha de los desplegables, que es
   una forma, no un adorno.
7. **La marca es tinta, no un color.** Los siete tonos semánticos ya se reparten
   todo el color de la pantalla; si la marca también fuera un color competiría
   con ellos. Antes el azul de marca era el mismo azul que el estado «en viaje».

El modo oscuro existe y se guarda en el navegador, pero **el claro es el
predeterminado**: no se hereda del sistema operativo.

## Cómo está armado

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Server Actions) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 con variables de tema propias |
| Base de datos | PostgreSQL 17 + Prisma 7 |
| Sesiones | JWT firmado (jose) en cookie httpOnly + bcrypt |
| Gráficos | Recharts y SVG propio |

```
src/
  actions/      Server actions: toda la escritura pasa por acá y valida permisos
  app/
    (app)/      Pantallas con sesión iniciada (comparten el menú lateral)
    login/      Ingreso
  components/
    forms/      Formularios en diálogo (gastos, mantenimiento, documentos…)
    lists/      Tablas reutilizables
    ui/         Botones, campos, tarjetas, tablas, paginación
  lib/          Prisma, sesiones, formatos, alertas, métricas, subida de archivos
prisma/         Esquema, migraciones y datos de demostración
```

Puntos de diseño que conviene conocer antes de tocar el código:

- **Archivar en vez de borrar.** Camiones, conductores y clientes se archivan
  para conservar el histórico de los reportes. El borrado definitivo existe,
  pide confirmación y avisa cuántos registros arrastra.
- **Los importes se guardan como `Float`.** Alcanza de sobra para los montos que
  maneja una flota; las sumas se redondean con `round2()` en `lib/format.ts`
  para que no se arrastren centavos. Si algún día se factura desde el sistema,
  conviene migrarlos a `Decimal`.
- **Las fechas sin hora** se guardan a mediodía UTC para que no cambien de día
  al mostrarse en la zona horaria local.
- **Las fotos y archivos** se guardan en `public/uploads/`. Todo pasa por
  `lib/storage.ts`: para mover el almacenamiento a S3, Supabase Storage o
  Vercel Blob solo hay que reemplazar `saveUpload` y `deleteUpload`.
- Las imágenes de la demo (`public/uploads/demo/`) son SVG generados; el cliente
  las reemplaza subiendo las fotos reales desde la ficha de cada camión.

---

## Poner en producción

1. **Base de datos.** Creá un PostgreSQL administrado (Neon, Supabase, Railway o
   un VPS propio) y poné su cadena de conexión en `DATABASE_URL`.
2. **Clave de sesiones.** Generá una nueva y ponela en `AUTH_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. **Migraciones.** `npm run db:deploy`.
4. **Primer administrador.** Definí `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` y
   corré el seed una sola vez, o creá el usuario a mano con `npm run db:studio`.
   No dejes las credenciales de la demo.
5. **Archivos subidos.** En un VPS o contenedor, montá `public/uploads` en un
   volumen persistente. En plataformas serverless como Vercel el disco se borra
   en cada despliegue: ahí hay que cambiar el driver de `lib/storage.ts` por un
   bucket.
6. **HTTPS.** La cookie de sesión se marca `secure` automáticamente cuando
   `NODE_ENV=production`, así que el sitio tiene que servirse por HTTPS.

## Lo que sigue

La base ya está preparada para crecer sin rehacer nada:

- **App para conductores** (React Native o PWA) que reporte viajes, tanqueos y
  novedades desde el celular. Los modelos de `Trip`, `Expense` y `Cargo` ya
  contemplan quién carga cada dato.
- **GPS en tiempo real**: falta agregar un modelo de posiciones y el mapa.
- **Facturación electrónica** a partir de los viajes y las cargas.
- **Avisos por correo o WhatsApp** de los vencimientos, reutilizando
  `lib/alerts.ts`.
