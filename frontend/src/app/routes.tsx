import type { RouteObject } from "react-router-dom";

import { AboutPage } from "../features/about/AboutPage";
import { BoardgameLookupPage } from "../features/boardgames/BoardgameLookupPage";
import { ChessPage } from "../features/chess/ChessPage";
import { HomePage } from "../features/home/HomePage";
import { AccessibilityPage } from "../features/legal/AccessibilityPage";
import { ImpressumPage } from "../features/legal/ImpressumPage";
import { PrivacyPolicyPage } from "../features/legal/PrivacyPolicyPage";
import { TermsPage } from "../features/legal/TermsPage";
import { FaqPage } from "../features/misc/FaqPage";
import { NotFoundPage } from "../features/misc/NotFoundPage";
import { SiteMapPage } from "../features/misc/SiteMapPage";
import { ArchetypeDecksPage } from "../features/mtg/ArchetypeDecksPage";
import { DeckPage } from "../features/mtg/DeckPage";
import { MtgCardDetailPage } from "../features/mtg/MtgCardDetailPage";
import { MtgMetaPage } from "../features/mtg/MtgMetaPage";
import { MtgPage } from "../features/mtg/MtgPage";
import { AppShell } from "../layout/AppShell";

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/mtg", element: <MtgPage /> },
      { path: "/mtg/meta", element: <MtgMetaPage /> },
      // Both deck routes must stay above /mtg/:id - a static segment wins
      // over a dynamic one in the router's ranking, but keeping them in
      // reading order makes that obvious rather than incidental.
      { path: "/mtg/decks", element: <ArchetypeDecksPage /> },
      { path: "/mtg/decks/:deckId", element: <DeckPage /> },
      { path: "/mtg/:id", element: <MtgCardDetailPage /> },
      { path: "/boardgames", element: <BoardgameLookupPage /> },
      { path: "/chess", element: <ChessPage /> },
      { path: "/legal/impressum", element: <ImpressumPage /> },
      { path: "/legal/privacy", element: <PrivacyPolicyPage /> },
      { path: "/legal/terms", element: <TermsPage /> },
      { path: "/legal/accessibility", element: <AccessibilityPage /> },
      { path: "/faq", element: <FaqPage /> },
      { path: "/sitemap", element: <SiteMapPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
