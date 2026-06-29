import React, { useEffect, useState } from 'react';
import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';
import { EnvManager } from '../environment/EnvManager';
import { SaveToCollectionDialog } from '../collection/SaveToCollectionDialog';
import { CollectionVariablesModal } from '../collection/CollectionVariablesModal';
import { useUIStore } from '../../stores/uiStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { checkCurl } from '../../services/curlService';
import { RequestTabs } from '../request/RequestTabs';
import { RequestPanel } from '../request/RequestPanel';
import { useRequestStore } from '../../stores/requestStore';
import { ResponsePanel } from '../response/ResponsePanel';
import { useResponseStore } from '../../stores/responseStore';
import './AppShell.css';

const EmptyState: React.FC = () => (
  <div className="empty-state">
    <div className="empty-state-icon">❖</div>
    <h2>reQuæst</h2>
    <p>Open a new tab to get started</p>
    <div className="shortcut-hint">
      <kbd>Ctrl</kbd> + <kbd>N</kbd>
    </div>
  </div>
);

export const AppShell: React.FC = () => {
  const { sidebarOpen, activeModal } = useUIStore();
  const { loadEnvironments } = useEnvironmentStore();

  const tabs = useRequestStore((state) => state.tabs);
  const activeTabId = useRequestStore((state) => state.activeTabId);
  const addTab = useRequestStore((state) => state.addTab);
  const closeTab = useRequestStore((state) => state.closeTab);
  const setActiveTab = useRequestStore((state) => state.setActiveTab);
  const saveActiveRequest = useRequestStore((state) => state.saveActiveRequest);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        addTab();
      } else if (e.ctrlKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActiveRequest();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addTab, closeTab, saveActiveRequest, activeTabId]);

  /** null = checking, string = curl version (OK), Error = not found */
  const [curlStatus, setCurlStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [curlError, setCurlError] = useState<string>('');

  // ── Startup: check curl availability, then load environments ──────────────
  useEffect(() => {
    checkCurl()
      .then(() => {
        setCurlStatus('ok');
        return loadEnvironments();
      })
      .catch((err: unknown) => {
        setCurlStatus('error');
        setCurlError(typeof err === 'string' ? err : 'curl is not available on this system.');
      });
  }, [loadEnvironments]);

  // ── Blocking error state — curl not available ─────────────────────────────
  if (curlStatus === 'error') {
    return (
      <div className="curl-error-screen">
        <div className="curl-error-card">
          <div className="curl-error-icon">⚠</div>
          <h1 className="curl-error-title">curl not found</h1>
          <p className="curl-error-body">
            reQuæst requires <strong>curl</strong>, which ships with Windows 10
            (build&nbsp;17063+) and Windows&nbsp;11.
          </p>
          <p className="curl-error-body">
            Make sure <code>C:\Windows\System32\curl.exe</code> exists, or
            install curl from{' '}
            <strong>curl.se/windows</strong> and add it to your{' '}
            <code>PATH</code>.
          </p>
          <details className="curl-error-details">
            <summary>Technical detail</summary>
            <pre>{curlError}</pre>
          </details>
        </div>
      </div>
    );
  }

  // ── Loading state (brief — only visible while checking curl) ──────────────
  if (curlStatus === 'checking') {
    return (
      <div className="curl-checking-screen">
        <span className="curl-checking-dot" />
        <span className="curl-checking-dot" />
        <span className="curl-checking-dot" />
      </div>
    );
  }

  // ── Normal app shell ──────────────────────────────────────────────────────
  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="app-shell-titlebar">
        <TitleBar />
      </div>

      {sidebarOpen && (
        <div className="app-shell-sidebar">
          <Sidebar />
        </div>
      )}

      <div className="app-shell-main" style={{ display: 'flex', flexDirection: 'column' }}>
        <RequestTabs 
          tabs={tabs}
          activeTabId={activeTabId}
          onAddTab={() => addTab()}
          onCloseTab={closeTab}
          onSelectTab={setActiveTab}
        />
        {activeTab ? (
          <div className="app-shell-workspace">
            <div className="app-shell-request">
              <RequestPanel tab={activeTab} />
            </div>
            <div className="app-shell-resizer" />
            <div className="app-shell-response">
              <ResponsePanelWrapper tabId={activeTab.id} />
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Global modals */}
      {activeModal === 'envManager' && <EnvManager />}
      {activeModal === 'saveToCollection' && <SaveToCollectionDialog />}
      {activeModal === 'collectionVariables' && <CollectionVariablesModal />}
    </div>
  );
};

// Wrapper to easily connect ResponsePanel to the store per tab
const ResponsePanelWrapper: React.FC<{ tabId: string }> = ({ tabId }) => {
  const tabData = useResponseStore((state) => state.tabData[tabId]);
  
  return (
    <ResponsePanel 
      response={tabData?.response} 
      isLoading={tabData?.isLoading || false}
      error={tabData?.error}
      consoleLogs={tabData?.consoleLogs || []}
    />
  );
};
