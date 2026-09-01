"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass } from "./Button";

/** Paginación simple que conserva los filtros activos en la query string. */
export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  function go(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3 no-print">
      <p className="text-sm text-[var(--text-muted)]">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className={buttonClass("secondary", "sm")}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </button>
        <span className="px-1 text-sm text-[var(--text-muted)]">
          {page} / {pages}
        </span>
        <button
          onClick={() => go(page + 1)}
          disabled={page >= pages}
          className={buttonClass("secondary", "sm")}
        >
          Siguiente
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
