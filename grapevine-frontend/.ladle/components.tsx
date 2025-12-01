import type { GlobalProvider } from "@ladle/react";
import { LayoutProvider } from "../src/context/LayoutContext";
import "../src/index.css";
import { useEffect } from "react";

// Provider that wraps every story - neobrutalism theme only
export const Provider: GlobalProvider = ({ children }) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'neobrutalism');
  }, []);

  return (
    <LayoutProvider>
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
        {children}
      </div>
    </LayoutProvider>
  );
};
