import type { RouteObject } from "react-router-dom";

import { AboutPage } from "../features/about/AboutPage";
import { ChessPage } from "../features/chess/ChessPage";
import { HomePage } from "../features/home/HomePage";
import { ImpressumPage } from "../features/legal/ImpressumPage";
import { PrivacyPolicyPage } from "../features/legal/PrivacyPolicyPage";
import { TermsPage } from "../features/legal/TermsPage";
import { NotFoundPage } from "../features/misc/NotFoundPage";
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
      { path: "/mtg/:id", element: <MtgCardDetailPage /> },
      { path: "/chess", element: <ChessPage /> },
      { path: "/legal/impressum", element: <ImpressumPage /> },
      { path: "/legal/privacy", element: <PrivacyPolicyPage /> },
      { path: "/legal/terms", element: <TermsPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];
