import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Guarda archivos subidos desde formularios en `public/uploads/<carpeta>`.
 *
 * Es el driver de disco local: sirve para desarrollo y para un servidor propio
 * o VPS con volumen persistente. Si el día de mañana despliegan en una
 * plataforma serverless (Vercel), hay que reemplazar el cuerpo de
 * `saveUpload`/`deleteUpload` por el SDK del bucket (S3, Supabase Storage,
 * Vercel Blob). El resto de la app solo conoce estas dos funciones.
 */

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const FILE_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  "application/pdf": "pdf",
};

export class UploadError extends Error {
  // El nombre permite que `toActionError` la reconozca y muestre su mensaje
  // tal cual, sin acoplar `lib/form` a este módulo (que es solo de servidor).
  override name = "UploadError";
}

type Kind = "image" | "document";

/**
 * Firmas de los primeros bytes de cada formato.
 *
 * `file.type` lo manda el navegador y por lo tanto lo controla quien sube el
 * archivo: se le puede poner `image/png` a cualquier cosa. Confiar en él para
 * elegir la extensión con la que se guarda significa que un archivo arbitrario
 * termina servido desde nuestro dominio con una extensión que no le
 * corresponde. Por eso además se miran los bytes reales.
 */
const FIRMAS: Record<string, (b: Buffer) => boolean> = {
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  // RIFF....WEBP
  webp: (b) =>
    b.subarray(0, 4).toString("ascii") === "RIFF" &&
    b.subarray(8, 12).toString("ascii") === "WEBP",
  // Caja ISO-BMFF 'ftyp' con marca avif
  avif: (b) =>
    b.subarray(4, 8).toString("ascii") === "ftyp" &&
    b.subarray(8, 12).toString("ascii").startsWith("avi"),
  pdf: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-",
};

function firmaCoincide(ext: string, buffer: Buffer) {
  const comprobar = FIRMAS[ext];
  return comprobar ? comprobar(buffer) : false;
}

/**
 * Devuelve la URL pública del archivo guardado, o null si el input venía vacío
 * (el navegador manda un File de 0 bytes cuando no se eligió nada).
 */
export async function saveUpload(
  file: FormDataEntryValue | null | undefined,
  folder: string,
  kind: Kind = "image"
): Promise<string | null> {
  if (!file || typeof file === "string") return null;
  if (file.size === 0) return null;

  const allowed = kind === "image" ? IMAGE_TYPES : FILE_TYPES;
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;

  const ext = allowed[file.type];
  if (!ext) {
    throw new UploadError(
      kind === "image"
        ? "Formato de imagen no admitido. Usá JPG, PNG, WebP o AVIF."
        : "Formato no admitido. Usá PDF o una imagen (JPG, PNG, WebP)."
    );
  }
  if (file.size > maxBytes) {
    throw new UploadError(
      `El archivo supera el máximo de ${Math.round(maxBytes / 1024 / 1024)} MB.`
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // El contenido tiene que ser lo que dice ser, no lo que declaró el navegador.
  if (!firmaCoincide(ext, buffer)) {
    throw new UploadError(
      kind === "image"
        ? "El archivo no es una imagen válida. Subí un JPG, PNG, WebP o AVIF real."
        : "El archivo no es un PDF ni una imagen válida."
    );
  }

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "");
  const dir = path.join(UPLOAD_ROOT, safeFolder);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${safeFolder}/${filename}`;
}

/** Borra un archivo previamente guardado. Ignora los que ya no existen. */
export async function deleteUpload(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  // Normalizamos para que un `..` en la URL no pueda salir de public/uploads.
  const relative = url.replace(/^\/uploads\//, "");
  const target = path.join(UPLOAD_ROOT, relative);
  if (!path.resolve(target).startsWith(path.resolve(UPLOAD_ROOT))) return;
  try {
    await unlink(target);
  } catch {
    // El archivo ya no está: nada que hacer.
  }
}

/**
 * Resuelve el valor final de un campo de foto en un formulario de edición:
 * archivo nuevo > señal de borrado > valor actual.
 */
export async function resolvePhotoField(
  formData: FormData,
  fieldName: string,
  folder: string,
  currentUrl: string | null,
  kind: Kind = "image"
): Promise<string | null> {
  const uploaded = await saveUpload(formData.get(fieldName), folder, kind);
  if (uploaded) {
    await deleteUpload(currentUrl);
    return uploaded;
  }
  if (formData.get(`${fieldName}__remove`) === "1") {
    await deleteUpload(currentUrl);
    return null;
  }
  return currentUrl;
}
