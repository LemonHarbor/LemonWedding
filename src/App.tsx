import React from "react";
import { Routes, Route, Navigate, useRoutes } from "react-router-dom";
import routes from "tempo-routes";
import { DevModeWrapper } from "./components/DevModeWrapper";

// Import page components
import LandingPage from "./components/pages/home";
import Dashboard from "./components/pages/dashboard";
import WeddingDashboard from "./components/pages/weddingDashboard";
import DesignCustomizer from "./components/pages/designCustomizer";
import Settings from "./components/pages/settings";
import Onboarding from "./components/pages/onboarding";
import Success from "./components/pages/success";
import DevModeDashboard from "./components/pages/DevModeDashboard";

// Import auth components
import AuthLayout from "./components/auth/AuthLayout";
import LoginForm from "./components/auth/LoginForm";
import SignUpForm from "./components/auth/SignUpForm";

const App = () => {
  // For Tempo storyboards
  const tempoRoutes = import.meta.env.VITE_TEMPO ? useRoutes(routes) : null;

  return (
    <DevModeWrapper>
      {/* Tempo routes for storyboards */}
      {tempoRoutes}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wedding-dashboard" element={<WeddingDashboard />} />
        <Route path="/design-customizer" element={<DesignCustomizer />} />
        <Route path="/settings/*" element={<Settings />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/success" element={<Success />} />
        <Route path="/dev-dashboard" element={<DevModeDashboard />} />

        {/* Auth routes */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginForm />
            </AuthLayout>
          }
        />
        <Route
          path="/signup"
          element={
            <AuthLayout>
              <SignUpForm />
            </AuthLayout>
          }
        />

        {/* Add this before the catchall route to allow Tempo to capture its routes */}
        {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}

        {/* Redirect any other routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </DevModeWrapper>
  );
};

export default App;
