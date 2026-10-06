import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { AuthProvider } from "./context/AuthContext";
import { LedgerProvider } from "./context/LedgerContext";
import { AuthModal } from "./components/AuthModal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LedgerProvider>
          <RouterProvider router={router} />
          <AuthModal />
        </LedgerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

