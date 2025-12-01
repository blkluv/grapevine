import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

// Theme is now fixed to neobrutalism
export type ThemeName = 'neobrutalism';

interface ThemeContextType {
  theme: ThemeName;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const theme: ThemeName = 'neobrutalism';

  // Apply theme to document on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'neobrutalism');
    document.body.style.backgroundColor = '#ffffff';
    localStorage.removeItem('grapevine-theme');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeContextProvider');
  }
  return context;
}
