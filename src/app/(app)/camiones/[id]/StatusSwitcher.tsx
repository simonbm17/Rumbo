"use client";

import { useRef } from "react";
import { setTruckStatus } from "@/actions/trucks";
import { TRUCK_STATUS, toOptions } from "@/lib/labels";
import type { TruckStatus } from "@/generated/prisma/enums";

/** Cambio de estado en un clic desde la ficha del camión. */
export function StatusSwitcher({
  truckId,
  status,
}: {
  truckId: string;
  status: TruckStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setTruckStatus} className="contents">
      <input type="hidden" name="truckId" value={truckId} />
      <label className="sr-only" htmlFor="truck-status">
        Estado del camión
      </label>
      <select
        id="truck-status"
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="input-base w-auto min-w-[190px]"
      >
        {toOptions(TRUCK_STATUS).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
