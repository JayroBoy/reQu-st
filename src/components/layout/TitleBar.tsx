import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useUIStore } from '../../stores/uiStore';
import { EnvSelector } from '../environment/EnvSelector';
import './TitleBar.css';

const appWindow = getCurrentWindow();

export const TitleBar: React.FC = () => {
  const { theme, toggleTheme } = useUIStore();

  return (
    <div className="titlebar glass-panel">
      {/* Drag region covers most of the bar */}
      <div className="titlebar-drag-region" data-tauri-drag-region />

      <div className="titlebar-left">
        <img src="/logo.png" alt="reQuæst logo" className="app-logo" />
        <span className="app-name">reQuæst</span>
      </div>

      <div className="titlebar-center">
        <EnvSelector />
      </div>

      <div className="titlebar-right">
        <button
          className="icon-button theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>

        {/* Window controls */}
        <div className="window-controls">
          <button
            className="wc-btn wc-minimize"
            title="Minimize"
            onClick={() => appWindow.minimize()}
          >
            <svg viewBox="0 0 10 1" width="10" height="1" fill="currentColor">
              <rect width="10" height="1"/>
            </svg>
          </button>
          <button
            className="wc-btn wc-maximize"
            title="Maximize"
            onClick={() => appWindow.toggleMaximize()}
          >
            <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="0.6" y="0.6" width="8.8" height="8.8"/>
            </svg>
          </button>
          <button
            className="wc-btn wc-close"
            title="Close"
            onClick={() => appWindow.close()}
          >
            <svg viewBox="0 0 10 10" width="10" height="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <line x1="1" y1="1" x2="9" y2="9"/>
              <line x1="9" y1="1" x2="1" y2="9"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
