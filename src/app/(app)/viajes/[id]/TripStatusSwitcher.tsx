"use client";

import { useRef } from "react";
import { setTripStatus } from "@/actions/trips";
import { TRIP_STATUS, toOptions } from "@/lib/labels";
import type { TripStatus } from "@/generated/prisma/enums";

/** Avanza el viaje de estado; el camión y el conductor se actualizan solos. */
export function TripStatusSwitcher({
  tripId,
  status,
}: {
  tripId: string;
  status: TripStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setTripStatus} className="contents">
      <input type="hidden" name="tripId" value={tripId} />
      <label className="sr-only" htmlFor="trip-status">
        Estado del viaje
      </label>
      <select
        id="trip-status"
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="input-base w-auto min-w-[180px]"
      >
        {toOptions(TRIP_STATUS).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
