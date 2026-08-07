# ADR-0010: Header-triggered nav overlay replaces the persistent sidebar

## Status
Accepted

## Context
The resizable/collapsible left sidebar from [ADR-0002](0002-sidebar-library.md)
didn't get restyled along with the rest of the shell's Ethereal Glass rework
and looked out of place - a plain flat link list permanently narrowing
`<main>`, inconsistent with the floating glass header and Double-Bezel cards
used everywhere else.

## Decision
Remove the persistent sidebar. The header's hamburger button now opens the
full-screen nav overlay (`MobileDrawer`) at every breakpoint instead of only
below `md`, matching the "Fluid Island" nav pattern already used for the
header pill. `react-resizable-panels` had no other consumers in the codebase,
so it was uninstalled rather than kept for a use case that no longer exists.

## Consequences
- `<main>` is always full width; there is no layout that narrows it for
  navigation.
- The header shows a small "&middot; <section>" label next to the logo so the
  current page is still legible without opening the overlay.
- Desktop and mobile now share a single nav implementation (`MobileDrawer`),
  removing the `isDesktop` branch and duplicate link-rendering that used to
  live in `Sidebar.tsx`.
- No more persisted sidebar width/collapsed state in `localStorage` - there's
  nothing left to persist.
