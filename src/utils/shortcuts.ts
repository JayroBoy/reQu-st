import { useRequestStore } from '../stores/requestStore';
import { useUIStore } from '../stores/uiStore';

/**
 * Registers global keyboard shortcuts for the application.
 * Call this once in App.tsx or AppShell.tsx.
 */
export function registerGlobalShortcuts(): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Only listen to Ctrl commands
    if (!e.ctrlKey) return;

    const key = e.key.toLowerCase();
    
    // Ignore if typing inside a CodeMirror editor (handled by CodeMirror) unless it's a global app shortcut
    // Ctrl+Z/Y for undo/redo are naturally handled by inputs and CodeMirror.

    if (key === 'enter') {
      e.preventDefault();
      useRequestStore.getState().sendActiveRequest();
    } else if (key === 'n') {
      e.preventDefault();
      useRequestStore.getState().addTab();
    } else if (key === 'w') {
      e.preventDefault();
      const activeTabId = useRequestStore.getState().activeTabId;
      if (activeTabId) {
        useRequestStore.getState().closeTab(activeTabId);
      }
    } else if (key === 's') {
      e.preventDefault();
      useRequestStore.getState().saveActiveRequest();
    } else if (key === 'l') {
      e.preventDefault();
      // Focus URL bar
      const urlInput = document.getElementById('request-url-input');
      if (urlInput) {
        urlInput.focus();
        if (urlInput instanceof HTMLInputElement) {
           urlInput.select();
        }
      }
    } else if (key === 'e') {
      e.preventDefault();
      // Quick switch env
      useUIStore.getState().setActiveModal('env-manager');
    } else if (key === 'tab') {
      e.preventDefault();
      const state = useRequestStore.getState();
      if (state.tabs.length > 1 && state.activeTabId) {
        const currentIndex = state.tabs.findIndex(t => t.id === state.activeTabId);
        if (currentIndex !== -1) {
          let nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
          if (nextIndex >= state.tabs.length) nextIndex = 0;
          if (nextIndex < 0) nextIndex = state.tabs.length - 1;
          state.setActiveTab(state.tabs[nextIndex].id);
        }
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
