import { useEffect, useState } from "react";

export type GeolocationState =
  | { status: "loading" }
  | { status: "denied" }
  | { status: "error" }
  | { status: "success"; latitude: number; longitude: number };

/** Wraps the one-shot browser geolocation callback API in a small state machine. */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({ status: "loading" });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ status: "error" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({ status: "success", latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      (error) => {
        setState({ status: error.code === error.PERMISSION_DENIED ? "denied" : "error" });
      },
      { timeout: 10_000 },
    );
  }, []);

  return state;
}
