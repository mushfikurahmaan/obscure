// Author: mushfikurahmaan
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import FirstSetup from "./pages/FirstSetup";
import Login from "./pages/Login";
import { hasDataFile } from './lib/utils';
import { ThemeProvider } from './lib/theme';

const queryClient = new QueryClient();

function AppRouter() {
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);

  // Helper to check login state
  const checkLogin = () => {
    setLoggedIn(!!sessionStorage.getItem('loggedIn'));
  };

  useEffect(() => {
    // Setup is complete if encrypted data file exists
    hasDataFile().then(setup => setSetupComplete(setup));
    checkLogin();

    // Listen for storage changes (in case another tab logs out)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'loggedIn') {
        checkLogin();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Listen for window focus (in case sessionStorage changes in this tab)
    const handleFocus = () => {
      checkLogin();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Handler to mark login (pass to Login page)
  const handleLogin = () => {
    sessionStorage.setItem('loggedIn', 'true');
    setLoggedIn(true);
  };

  // Handler to mark setup complete (pass to FirstSetup page)
  const handleSetupComplete = () => {
    setSetupComplete(true);
  };

  if (setupComplete === null) return null; // or a loading spinner

  if (!setupComplete) {
    // Always show FirstSetup until setup is done
    return <FirstSetup onSetupComplete={handleSetupComplete} />;
  }

  if (!loggedIn) {
    // Always show Login until logged in
    return <Login onLogin={handleLogin} />;
  }

  // User is setup and logged in, show the app
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
