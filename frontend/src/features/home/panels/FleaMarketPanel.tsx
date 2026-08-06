import { InfoPanelCard } from "./InfoPanelCard";

// Placeholder only - no backend endpoint, no scraper, fake entries until a
// real flea-market data source is decided on.
const FAKE_EVENTS = [
  { name: "Stadtpark Flohmarkt", date: "Sat, Aug 15", location: "Stadtpark" },
  { name: "Hafenmarkt Trödel", date: "Sun, Aug 23", location: "Hafenmarkt" },
  { name: "Kirchplatz Second-Hand", date: "Sat, Sep 5", location: "Kirchplatz" },
];

export function FleaMarketPanel() {
  return (
    <InfoPanelCard title="Flea Market">
      <p className="mb-2 text-xs text-slate-500">Placeholder data - not a real feed yet.</p>
      <ul className="flex flex-col gap-2">
        {FAKE_EVENTS.map((event) => (
          <li key={event.name} className="text-sm text-slate-300">
            <span className="font-medium text-slate-100">{event.name}</span>
            <br />
            <span className="text-slate-400">
              {event.date} &middot; {event.location}
            </span>
          </li>
        ))}
      </ul>
    </InfoPanelCard>
  );
}
