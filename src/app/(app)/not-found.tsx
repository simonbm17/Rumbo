import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-muted)]">
        <SearchX className="size-7" />
      </span>
      <div>
        <h1 className="text-xl font-semibold">No encontramos esa página</h1>
        <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
          El registro que buscas pudo haberse eliminado o el enlace no es
          correcto.
        </p>
      </div>
      <Link href="/panel" className={buttonClass("primary")}>
        Volver al panel
      </Link>
    </div>
  );
}
