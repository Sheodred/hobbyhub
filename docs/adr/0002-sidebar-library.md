# ADR-0002: Resizable sidebar library

## Status
Accepted

## Context
The spec allows either `react-resizable-panels` or `allotment` for the
resizable/collapsible sidebar with persisted width.

## Decision
`react-resizable-panels`.

## Consequences
- Native `autoSaveId` prop persists panel layout to `localStorage` directly
  — no hand-rolled persistence logic needed.
- First-class React API (`PanelGroup`/`Panel`/`PanelResizeHandle`) rather
  than a wrapped non-React library.
- Adapts more cleanly to the collapse-to-drawer-on-mobile requirement:
  conditionally render `PanelGroup` vs. `MobileDrawer` below a breakpoint.
- `allotment` skews toward VSCode-style panes with a weaker touch/mobile
  story — not chosen for that reason.
