# Rumbo — notas de despliegue

Lo mínimo que hay que saber antes de poner Rumbo en producción para una
empresa. No es un manual: son las cuatro cosas que, si se ignoran, rompen algo.

---

## 1. El seed de demostración BORRA datos

`npm run db:seed` empieza vaciando las once tablas. Contra una base real eso no
siembra nada: elimina la operación de la empresa.

La guardia exige **las dos** condiciones a la vez:

- `NODE_ENV` distinto de `production`;
- `ALLOW_DEMO_SEED=true`.

Cualquiera que falte lo bloquea, con código de salida distinto de cero y sin
haber tocado la base.

```bash
# desarrollo, autorizado explícitamente
ALLOW_DEMO_SEED=true npm run db:seed
```

No dejes `ALLOW_DEMO_SEED` escrita en un `.env` que pueda llegar a un servidor.
Se escribe en el momento y se olvida.

---

## 2. Administrador y contraseñas

Rumbo no tiene «olvidé mi contraseña», y para uno o dos usuarios no debería
tenerlo. Lo que sí hay es una herramienta local:

```bash
npm run admin -- create    # crea un administrador
npm run admin -- reset     # cambia la contraseña de un usuario existente
```

Pide los datos por consola y la contraseña **sin eco**. Nunca se pasa como
argumento: en la línea de comandos quedaría en el historial del intérprete y en
la lista de procesos.

- Aplica la misma longitud mínima que el formulario de la aplicación
  (`MIN_PASSWORD`, en `src/lib/form.ts`).
- Hash bcrypt coste 12, igual que `hashPassword()`.
- `reset` sobre un correo inexistente **falla**; no crea cuentas en silencio.

**En producción no debe existir `admin@rumbo.app`.** El administrador real se
crea con `create`, con el correo de la empresa, y esa persona cambia su
contraseña desde Configuración en cuanto entra.

---

## 3. Node

```json
"engines": { "node": ">=22.12.0 <23" }
```

Node 22 LTS. Es lo que satisface a la vez a Next 16.3 (≥20.9), a Prisma 7.10
(`^22.12`) y a Vitest, y evita la versión de Node 24 donde documentamos un
aborto nativo de V8 en Windows.

`engines.node` es el único mecanismo que respetan tanto Nixpacks como Railpack;
**no hace falta `.nvmrc`** —Nixpacks no lo lee— y añadirlo solo crearía dos
sitios donde equivocarse.

El desarrollo local sigue usando el Node que haya instalado; esta restricción
gobierna el constructor de la plataforma.

---

## 4. Archivos subidos — leer entero antes de desplegar

Las fotos y los documentos se guardan en el disco local:

```
UPLOAD_ROOT = <directorio de trabajo del proceso>/public/uploads
```

Es `path.join(process.cwd(), "public", "uploads")` (`src/lib/storage.ts`). El
directorio de trabajo lo fija la plataforma; en un contenedor construido por
Railway suele ser `/app`, con lo que el montaje sería **`/app/public/uploads`**.
**Confírmalo en el contenedor real antes de crear el volumen**: si `cwd` fuera
otro, el volumen quedaría montado donde no escribe nadie.

### El defecto que había, y cómo quedó resuelto

`next start` compone la lista de archivos de `public/` **al arrancar**, no en
cada petición. Medido en un build de producción local:

| archivo | antes | ahora |
|---|---|---|
| existía al arrancar el servidor | 200 | 200 |
| escrito con el servidor ya en marcha | **404** | **200** |
| el mismo, tras reiniciar el proceso | 200 | 200 |

Es decir: un volumen persistente conservaba el archivo pero no bastaba para que
se viera. Subir una foto la dejaba invisible hasta el siguiente reinicio, y los
vehículos se muestran con `<img src={photoUrl}>` directo.

Lo resuelve **`src/app/uploads/[...ruta]/route.ts`**, que lee del disco en cada
petición. Next sigue sirviendo por la vía estática lo que ya conocía y cae en el
manejador con todo lo demás; las dos vías leen el mismo directorio
(`getUploadsDir()`), así que desde fuera no se nota la diferencia.

Las URL no cambian: siguen siendo `/uploads/<carpeta>/<uuid>.<ext>` y no hizo
falta tocar la base.

Sirve solo lo que el sistema es capaz de guardar —JPG, PNG, WebP, AVIF y PDF—,
no lista directorios, y cualquier intento de salirse del directorio devuelve el
mismo 404 que un archivo inexistente. `tests/unit/uploads-route.test.ts` fija
ese contrato.

### El volumen sigue haciendo falta

El manejador resuelve que el archivo **se vea**; el volumen resuelve que
**sobreviva** a un redespliegue. Son dos cosas distintas y hacen falta las dos.
