import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useGeolocation } from "../../../hooks/useGeolocation";
import { InfoPanelCard } from "./InfoPanelCard";
import { getFleaMarketEvents } from "./newsApi";

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EARTH_RADIUS_KM = 6371;

// Haversine great-circle distance - fine at this scale (all listings are
// within ~50km of Dortmund), no need for a more precise ellipsoidal model.
function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km away` : `${Math.round(km)} km away`;
}

const VISIBLE_COUNT = 5;

export function FleaMarketPanel() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["flea-market"], queryFn: getFleaMarketEvents });
  const geolocation = useGeolocation();
  const userLocation = geolocation.status === "success" ? geolocation : null;
  const [expanded, setExpanded] = useState(false);

  if (isError) {
    return (
      <InfoPanelCard title="Flea Market">
        <p className="text-sm text-slate-400">Couldn&apos;t load flea market dates right now.</p>
      </InfoPanelCard>
    );
  }

  if (isLoading) {
    return (
      <InfoPanelCard title="Flea Market">
        <div className="animate-pulse space-y-2" aria-hidden="true">
          <div className="h-4 w-full rounded bg-slate-800" />
          <div className="h-4 w-5/6 rounded bg-slate-800" />
          <div className="h-4 w-3/4 rounded bg-slate-800" />
        </div>
        <span className="sr-only">Loading flea market dates…</span>
      </InfoPanelCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <InfoPanelCard title="Flea Market">
        <p className="text-sm text-slate-400">No flea markets in the next 30 days.</p>
      </InfoPanelCard>
    );
  }

  const visibleEvents = expanded ? data : data.slice(0, VISIBLE_COUNT);
  const hasMore = data.length > VISIBLE_COUNT;

  return (
    <InfoPanelCard title="Flea Market">
      <ul className="flex flex-col divide-y divide-white/5">
        {visibleEvents.map((event) => (
          <li key={event.url} className="py-3 text-sm text-slate-300 first:pt-0 last:pb-0">
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-slate-100 hover:text-indigo-400 hover:underline"
            >
              {event.name}
            </a>
            <p className="mt-1 text-slate-400">
              {formatEventDate(event.date)}
              {event.location && ` · ${event.location}`}
              {userLocation && event.latitude !== null && event.longitude !== null && (
                <> · {formatDistance(distanceKm(userLocation, { latitude: event.latitude, longitude: event.longitude }))}</>
              )}
            </p>
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          {expanded ? "Show less" : `Show ${data.length - VISIBLE_COUNT} more`}
        </button>
      )}
    </InfoPanelCard>
  );
}
