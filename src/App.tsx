import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { historyService } from './services/historyService';
import { useUIStore } from './stores/uiStore';
import { registerGlobalShortcuts } from './utils/shortcuts';
import './App.css';

function App() {
  const { theme } = useUIStore();

  // Ensure theme is set on initial mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Init history service
  useEffect(() => {
    historyService.init();
  }, []);

  // Register shortcuts
  useEffect(() => {
    return registerGlobalShortcuts();
  }, []);

  return <AppShell />;
}

export default App;
