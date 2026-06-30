import React, { useState } from 'react';
import type { RequestResponse } from '../../types/response';
import { ResponseBody } from './ResponseBody';
import { ResponseHeaders } from './ResponseHeaders';
import { ScriptConsole } from './ScriptConsole';
import './ResponsePanel.css';

interface ResponsePanelProps {
  response?: RequestResponse;
  isLoading: boolean;
  error?: string;
  consoleLogs: string[];
}

type TabId = 'body' | 'headers' | 'console';

export const ResponsePanel: React.FC<ResponsePanelProps> = ({ response, isLoading, error, consoleLogs }) => {
  const [activeTab, setActiveTab] = useState<TabId>('body');

  if (isLoading) {
    return (
      <div className="response-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton" style={{ height: '32px', width: '200px' }} />
        <div className="skeleton" style={{ height: '16px', width: '100%' }} />
        <div className="skeleton" style={{ height: '16px', width: '80%' }} />
        <div className="skeleton" style={{ height: '16px', width: '90%' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-panel empty-state error-state">
        <p>Could not send request:</p>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-panel empty-state">
        <p>Enter a URL and click Send to get a response</p>
      </div>
    );
  }

  const getStatusColorClass = (code: number) => {
    if (code >= 200 && code < 300) return 'status-success';
    if (code >= 300 && code < 400) return 'status-redirect';
    if (code >= 400 && code < 500) return 'status-client-error';
    if (code >= 500) return 'status-server-error';
    return 'status-unknown';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="response-panel fade-in">
      <div className="rp-status-bar">
        <div className="rp-status-items">
          <span className={`rp-badge ${getStatusColorClass(response.status)}`}>
            {response.status} {response.statusText}
          </span>
          <span className="rp-badge rp-badge-neutral">
            {response.time} ms
          </span>
          <span className="rp-badge rp-badge-neutral">
            {formatSize(response.size)}
          </span>
        </div>
        <div className="rp-tabs">
          <button
            className={`rp-tab-btn ${activeTab === 'body' ? 'active' : ''}`}
            onClick={() => setActiveTab('body')}
          >
            Body
          </button>
          <button
            className={`rp-tab-btn ${activeTab === 'headers' ? 'active' : ''}`}
            onClick={() => setActiveTab('headers')}
          >
            Headers ({response.headers.length})
          </button>
          <button
            className={`rp-tab-btn ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            Console {consoleLogs.length > 0 && <span className="console-dot" />}
          </button>
        </div>
      </div>

      <div className="rp-content">
        {activeTab === 'body' && <ResponseBody response={response} />}
        {activeTab === 'headers' && <ResponseHeaders headers={response.headers} />}
        {activeTab === 'console' && <ScriptConsole logs={consoleLogs} />}
      </div>
    </div>
  );
};
