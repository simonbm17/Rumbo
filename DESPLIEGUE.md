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

### Y hay algo más, medido y verificado

`next start` compone la lista de archivos de `public/` **al arrancar**, no en
cada petición. Comprobado en un build de producción local:

| archivo | resultado |
|---|---|
| existía al arrancar el servidor | **HTTP 200** |
| escrito con el servidor ya en marcha | **HTTP 404** |
| el mismo, tras reiniciar el proceso | **HTTP 200** |

Es decir: **un volumen persistente conserva el archivo, pero no basta para que
se vea.** Tras subir una foto, la imagen dará 404 hasta que el proceso se
reinicie. Los vehículos se muestran con `<img src={photoUrl}>` directo, así que
esto afecta a la pantalla que más se usa.

**Esto no está resuelto.** Antes de que el cliente cargue fotos hay que decidir
entre:

1. servir `/uploads` fuera de `public/` mediante un manejador de ruta que lea
   del disco en cada petición;
2. mover el almacenamiento a un bucket de objetos.

La opción 1 es pequeña y no cambia la arquitectura; la 2 es la que el propio
`storage.ts` anticipa. Mientras tanto, un volumen persistente sigue siendo
necesario —sin él el archivo ni siquiera sobrevive—, pero no es suficiente.
