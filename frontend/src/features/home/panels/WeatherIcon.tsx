import type { WeatherKind } from "./weatherCodes";

interface WeatherIconProps {
  kind: WeatherKind;
  isDay: boolean;
  className?: string;
}

// Hand-drawn to match the line-icon style already used in Header/Sidebar
// (currentColor, 1.5 stroke) instead of pulling in an icon library.
export function WeatherIcon({ kind, isDay, className }: WeatherIconProps) {
  const shared = { viewBox: "0 0 24 24", fill: "none", "aria-hidden": true as const, className };

  if (kind === "clear") {
    return isDay ? (
      <svg {...shared}>
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ) : (
      <svg {...shared}>
        <path
          d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "partly-cloudy") {
    return (
      <svg {...shared}>
        {isDay ? (
          <>
            <circle cx="9" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M9 3.5v1.6M3.5 10H5M13 10h1.6M4.9 5.9l1.1 1.1M13.1 5.9 12 7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        ) : (
          <path
            d="M13.5 5a4.3 4.3 0 0 1-5.2 5.6A4.3 4.3 0 0 0 13.5 5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}
        <path
          d="M8 19a4 4 0 0 1 .3-8 5 5 0 0 1 9.6 1.8A3.7 3.7 0 0 1 17.5 19H8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "cloudy") {
    return (
      <svg {...shared}>
        <path
          d="M6.5 18a4 4 0 0 1 .3-8 5.5 5.5 0 0 1 10.6 2A3.8 3.8 0 0 1 17 18H6.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "fog") {
    return (
      <svg {...shared}>
        <path
          d="M6 13a3.5 3.5 0 0 1 .3-7 4.8 4.8 0 0 1 9.3 1.7A3.3 3.3 0 0 1 15.5 14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M4 17h16M6 20h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "rain") {
    return (
      <svg {...shared}>
        <path
          d="M6.5 14a4 4 0 0 1 .3-8 5.5 5.5 0 0 1 10.6 2A3.8 3.8 0 0 1 17 14H6.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M8 17.5 7 20M12 17.5l-1 2.5M16 17.5l-1 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "snow") {
    return (
      <svg {...shared}>
        <path
          d="M6.5 13a4 4 0 0 1 .3-8 5.5 5.5 0 0 1 10.6 2A3.8 3.8 0 0 1 17 13H6.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M8 17v4M6 18.5l4 1M6 20.5l4-1M16 17v4M14 18.5l4 1M14 20.5l4-1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <path
        d="M6.5 13a4 4 0 0 1 .3-8 5.5 5.5 0 0 1 10.6 2A3.8 3.8 0 0 1 17 13H6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m13 16-3 4h2.5l-1.5 3.5L15 18h-2.5L13 16Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
