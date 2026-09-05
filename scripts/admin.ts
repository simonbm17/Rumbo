import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { MIN_PASSWORD } from "../src/lib/form";

/**
 * ADMINISTRACIÓN DE EMERGENCIA. Se ejecuta a mano, desde una máquina de
 * confianza, contra la base que se le indique en `DATABASE_URL`.
 *
 * Existe porque Rumbo NO tiene «olvidé mi contraseña», y para una empresa de
 * uno o dos usuarios no debería tenerlo: un flujo de recuperación por correo
 * significa servidor de correo, plantillas, tokens con caducidad y una ruta
 * pública más que atacar. Todo eso para un caso que ocurrirá, con suerte, una
 * vez. Lo que sí hace falta es que ese día exista una salida que no sea editar
 * un hash a mano en SQL.
 *
 *   npm run admin -- create    crea el primer administrador
 *   npm run admin -- reset     cambia la contraseña de uno que ya existe
 *
 * ── LA CONTRASEÑA NUNCA VIAJA COMO ARGUMENTO ────────────────────────────────
 *
 * Se pide por consola y con el eco apagado. Un `npm run admin -- correo Clave123`
 * dejaría la contraseña en el historial del intérprete, en la lista de procesos
 * mientras dura el comando y en cualquier registro que capture la línea. Por eso
 * el script no acepta contraseñas por parámetro: no es que no las lea, es que no
 * hay forma de dárselas así.
 *
 * ── LO QUE REUTILIZA ────────────────────────────────────────────────────────
 *
 * La longitud mínima sale de `MIN_PASSWORD`, la misma constante que valida el
 * formulario de la aplicación: si mañana la política cambia, cambia en un sitio.
 * El hash es bcrypt con coste 12, idéntico a `hashPassword()` de `lib/auth.ts`.
 * No se importa esa función porque el módulo lleva `server-only` y `next/headers`,
 * que fuera de una petición de Next no se pueden cargar; es el mismo motivo por
 * el que el seed también llama a bcrypt directamente.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

/** Dónde estamos apuntando, sin usuario, contraseña ni parámetros. */
function destino() {
  const url = process.env.DATABASE_URL;
  if (!url) return "(DATABASE_URL no definida)";
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}/${u.pathname.slice(1)}`;
  } catch {
    return "(DATABASE_URL no interpretable)";
  }
}

/*
  ENTRADA. Dos caminos, y el segundo existe para poder PROBAR la herramienta.

  En una terminal de verdad se usa `readline` y la contraseña se escribe sin
  eco. Cuando la entrada es una tubería —una prueba, un guion— `readline` cierra
  el flujo tras la primera respuesta y las siguientes fallan con «readline was
  closed»; por eso ahí se lee todo de una vez y se va consumiendo línea a línea.

  En los dos casos la contraseña llega por la ENTRADA ESTÁNDAR, nunca por
  `process.argv`: no queda en el historial del intérprete, ni en la lista de
  procesos, ni en los registros de nadie.
*/
const interactivo = Boolean(stdin.isTTY);
const rl = interactivo ? createInterface({ input: stdin, output: stdout }) : null;

let cola: string[] | null = null;
async function leerCola(): Promise<string[]> {
  if (cola) return cola;
  const trozos: Buffer[] = [];
  for await (const t of stdin) trozos.push(Buffer.from(t));
  cola = Buffer.concat(trozos).toString("utf8").split(/\r?\n/);
  return cola;
}

async function preguntar(etiqueta: string): Promise<string> {
  if (rl) return rl.question(etiqueta);
  const lineas = await leerCola();
  stdout.write(etiqueta + "\n");
  return lineas.shift() ?? "";
}

/**
 * Lee una contraseña sin mostrarla.
 *
 * `readline` no trae modo oculto, así que se silencia la salida mientras dura
 * la respuesta. Se hace con lo que ya tiene Node: añadir una dependencia para
 * ocultar un eco sería traer código de terceros al camino de una contraseña.
 * Fuera de una terminal no hay nada que ocultar —no se está imprimiendo— y se
 * lee igual que cualquier otra respuesta.
 */
async function leerSecreto(etiqueta: string): Promise<string> {
  if (!rl) return preguntar(etiqueta);

  stdout.write(etiqueta);
  const original = stdout.write.bind(stdout);
  let silenciar = true;
  (stdout as unknown as { write: unknown }).write = ((
    chunk: string | Uint8Array,
    ...resto: unknown[]
  ) => {
    if (silenciar) return true;
    return (original as (...a: unknown[]) => boolean)(chunk, ...resto);
  }) as typeof stdout.write;

  try {
    return await rl.question("");
  } finally {
    silenciar = false;
    (stdout as unknown as { write: typeof stdout.write }).write = original;
    stdout.write("\n");
  }
}

/** La misma regla que aplica el formulario de la aplicación. */
function validar(clave: string, confirmacion: string) {
  if (clave.length < MIN_PASSWORD) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
  }
  if (clave !== confirmacion) {
    throw new Error("La confirmación no coincide con la contraseña.");
  }
}

async function pedirContrasena() {
  const clave = await leerSecreto("Contraseña nueva: ");
  const confirmacion = await leerSecreto("Repite la contraseña: ");
  validar(clave, confirmacion);
  return bcrypt.hash(clave, 12);
}

async function crear() {
  const email = (await preguntar("Correo del administrador: ")).trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Ese correo no parece válido.");

  const existe = await prisma.user.findUnique({ where: { email } });
  if (existe) {
    throw new Error(
      `Ya existe un usuario con ese correo. Usa «reset» si lo que quieres es cambiarle la contraseña.`
    );
  }

  const name = (await preguntar("Nombre y apellido: ")).trim();
  if (!name) throw new Error("El nombre es obligatorio.");

  const passwordHash = await pedirContrasena();

  await prisma.user.create({
    data: { email, name, passwordHash, role: "ADMIN", active: true },
  });
  console.log(`\nAdministrador creado: ${name} <${email}>`);
}

async function restablecer() {
  const email = (await preguntar("Correo del usuario: ")).trim().toLowerCase();

  /*
    Si no existe NO se crea en silencio. Un «reset» que crea usuarios convierte
    un correo mal escrito en una cuenta fantasma con permisos de administrador.
  */
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(
      `No existe ningún usuario con ese correo. Si querías crearlo, usa «create».`
    );
  }

  const passwordHash = await pedirContrasena();
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  console.log(`\nContraseña actualizada para ${user.name} <${user.email}>`);
}

async function main() {
  const modo = process.argv[2];

  if (modo !== "create" && modo !== "reset") {
    console.error(
      [
        "",
        "Administración de Rumbo.",
        "",
        "  npm run admin -- create    crea un administrador",
        "  npm run admin -- reset     cambia la contraseña de un usuario existente",
        "",
        "La contraseña se pide por consola; nunca se pasa como argumento.",
        "",
      ].join("\n")
    );
    process.exit(1);
  }

  console.log(`\nBase de datos: ${destino()}\n`);

  if (modo === "create") await crear();
  else await restablecer();
}

main()
  .catch((error) => {
    console.error(`\n${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    rl?.close();
    await prisma.$disconnect();
  });
