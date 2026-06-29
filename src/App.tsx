import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { useUIStore } from './stores/uiStore';
import './App.css';

function App() {
  const { theme } = useUIStore();

  // Ensure theme is set on initial mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <AppShell />;
}

export default App;
