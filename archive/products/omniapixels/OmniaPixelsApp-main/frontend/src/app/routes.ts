import { createBrowserRouter } from "react-router-dom";
import { Root } from "./components/layout/Root";
import { SplashScreen } from "./components/screens/SplashScreen";
import { OnboardingScreen } from "./components/screens/OnboardingScreen";
import { AuthScreen } from "./components/screens/AuthScreen";
import { HomeScreen } from "./components/screens/HomeScreen";
import { EditorScreen } from "./components/screens/EditorScreen";
import { QueueScreen } from "./components/screens/QueueScreen";
import { GalleryScreen } from "./components/screens/GalleryScreen";
import { CompareScreen } from "./components/screens/CompareScreen";
import { ExportScreen } from "./components/screens/ExportScreen";
import { PricingScreen } from "./components/screens/PricingScreen";
import { SettingsScreen } from "./components/screens/SettingsScreen";
import React from "react";

export const router = createBrowserRouter([
  {
    path: "/",
    element: React.createElement(Root),
    children: [
      { index: true, element: React.createElement(SplashScreen) },
      { path: "onboarding", element: React.createElement(OnboardingScreen) },
      { path: "auth", element: React.createElement(AuthScreen) },
      { path: "home", element: React.createElement(HomeScreen) },
      { path: "editor", element: React.createElement(EditorScreen) },
      { path: "queue", element: React.createElement(QueueScreen) },
      { path: "gallery", element: React.createElement(GalleryScreen) },
      { path: "compare", element: React.createElement(CompareScreen) },
      { path: "export", element: React.createElement(ExportScreen) },
      { path: "pricing", element: React.createElement(PricingScreen) },
      { path: "settings", element: React.createElement(SettingsScreen) },
    ],
  },
]);
