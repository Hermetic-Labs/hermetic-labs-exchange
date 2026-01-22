import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const themes = ['light', 'dark', 'system'];

const UIContext = createContext<any>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const { currentMode, setCurrentMode } = useAuth();
  const [theme, setTheme] = useState('light');
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cortexTransition, _setCortexTransition] = useState(false);

  function toggleTheme() {
    setTheme(prev => {
      const idx = themes.indexOf(prev);
      return themes[(idx + 1) % themes.length];
    });
  }

  function toggleSidebar() {
    setSidebarCollapsed(prev => !prev);
  }

  function switchMode(mode: 'extended' | 'hybrid') {
    setCurrentMode(mode);
  }

  // Sync theme with system preference
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        // Theme will be handled by CSS or parent component
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Persist UI preferences
  useEffect(() => {
    localStorage.setItem('eve.ui.sidebarCollapsed', JSON.stringify(sidebarCollapsed));
    localStorage.setItem('eve.ui.theme', theme);
  }, [sidebarCollapsed, theme]);

  // Load persisted UI preferences
  useEffect(() => {
    const savedSidebar = localStorage.getItem('eve.ui.sidebarCollapsed');
    const savedTheme = localStorage.getItem('eve.ui.theme');

    if (savedSidebar) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarCollapsed(JSON.parse(savedSidebar));
    }
    if (savedTheme && themes.includes(savedTheme)) {
      setTheme(savedTheme);
    }
     
  }, []);

  function openPanel(id: string) {
    setActivePanel(id);
  }

  return (
    <UIContext.Provider value={{ 
      theme, 
      toggleTheme, 
      activePanel, 
      openPanel,
      sidebarCollapsed,
      toggleSidebar,
      currentMode,
      switchMode,
      cortexTransition
    }}>
      {children}
    </UIContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
