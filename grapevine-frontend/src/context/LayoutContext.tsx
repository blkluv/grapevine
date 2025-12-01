import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type LayoutVariant = 'default' | 'modern' | 'dense';

interface LayoutContextType {
  layoutVariant: LayoutVariant;
  setLayoutVariant: (variant: LayoutVariant) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children, initialVariant = 'default' }: { children: ReactNode; initialVariant?: LayoutVariant }) {
  const [layoutVariant, setLayoutVariant] = useState<LayoutVariant>(initialVariant);

  return (
    <LayoutContext.Provider value={{ layoutVariant, setLayoutVariant }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

