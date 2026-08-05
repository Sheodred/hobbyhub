import type { RouteObject } from "react-router-dom";

import { AboutPage } from "../features/about/AboutPage";
import { LoginPage } from "../features/auth/LoginPage";
import { ProfilePage } from "../features/auth/ProfilePage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";
import { SignupPage } from "../features/auth/SignupPage";
import { ChessPage } from "../features/chess/ChessPage";
import { HomePage } from "../features/home/HomePage";
import { ImpressumPage } from "../features/legal/ImpressumPage";
import { PrivacyPolicyPage } from "../features/legal/PrivacyPolicyPage";
import { TermsPage } from "../features/legal/TermsPage";
import { ListingDetailPage } from "../features/marketplace/ListingDetailPage";
import { ListingFormPage } from "../features/marketplace/ListingFormPage";
import { MarketplacePage } from "../features/marketplace/MarketplacePage";
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
      { path: "/marketplace", element: <MarketplacePage /> },
      {
        path: "/marketplace/new",
        element: (
          <ProtectedRoute>
            <ListingFormPage />
          </ProtectedRoute>
        ),
      },
      { path: "/marketplace/:id", element: <ListingDetailPage /> },
      {
        path: "/marketplace/:id/edit",
        element: (
          <ProtectedRoute>
            <ListingFormPage />
          </ProtectedRoute>
        ),
      },
      { path: "/chess", element: <ChessPage /> },
      { path: "/legal/impressum", element: <ImpressumPage /> },
      { path: "/legal/privacy", element: <PrivacyPolicyPage /> },
      { path: "/legal/terms", element: <TermsPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
    ],
  },
];
