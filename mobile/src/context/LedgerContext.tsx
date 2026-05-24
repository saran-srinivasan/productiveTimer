import React, { createContext, useContext } from "react";
import { useLedgerData } from "../hooks/useLedgerData";

const LedgerContext = createContext<any>(null);

export const LedgerProvider = ({ children }: { children: React.ReactNode }) => {
  const ledger = useLedgerData();
  return (
    <LedgerContext.Provider value={ledger}>
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error("useLedger must be used within a LedgerProvider");
  }
  return context;
};
