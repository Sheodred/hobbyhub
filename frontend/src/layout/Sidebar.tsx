import { useRef, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from "react-resizable-panels";

import { legalNavLinks, primaryNavLinks } from "./navigation";

const sidebarLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm transition-colors ${
    isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
  }`;

interface SidebarProps {
  children: ReactNode;
}

/**
 * Desktop-only resizable/collapsible sidebar (see docs/adr/0002). Width and
 * collapsed state persist to localStorage via autoSaveId - no hand-rolled
 * persistence logic needed. Hidden below md; MobileDrawer covers that case.
 */
export function Sidebar({ children }: SidebarProps) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [collapsed, setCollapsed] = useState(false);

  function toggleCollapsed() {
    const panel = panelRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }

  return (
    <PanelGroup direction="horizontal" autoSaveId="hobbyhub-shell">
      <Panel
        ref={panelRef}
        id="sidebar"
        order={1}
        defaultSize={20}
        minSize={14}
        maxSize={32}
        collapsible
        collapsedSize={4}
        onCollapse={() => setCollapsed(true)}
        onExpand={() => setCollapsed(false)}
        className="border-r border-slate-800 bg-slate-900/60"
      >
        <div className="flex h-full flex-col overflow-y-auto p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="mb-3 self-end rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
            >
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {!collapsed && (
            <nav aria-label="Sections" className="flex flex-col gap-1">
              {primaryNavLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={sidebarLinkClass} end={link.to === "/"}>
                  {link.label}
                </NavLink>
              ))}
              <hr className="my-2 border-slate-800" />
              {legalNavLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={sidebarLinkClass}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </Panel>

      <PanelResizeHandle className="w-1 bg-slate-800 transition-colors hover:bg-indigo-500 data-[resize-handle-state=drag]:bg-indigo-500" />

      <Panel id="main" order={2} minSize={50}>
        {children}
      </Panel>
    </PanelGroup>
  );
}
