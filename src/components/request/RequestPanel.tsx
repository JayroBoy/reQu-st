import React, { useState } from 'react';
import type { RequestTab } from '../../types/request';
import { RequestBuilder } from './RequestBuilder';
import { ParamsEditor } from './ParamsEditor';
import { HeadersEditor } from './HeadersEditor';
import { BodyEditor } from './BodyEditor';
import { AuthEditor } from './AuthEditor';
import { ScriptEditor } from './ScriptEditor';
import { useRequestStore } from '../../stores/requestStore';
import './RequestPanel.css';

interface RequestPanelProps {
  tab: RequestTab;
}

type SubTab = 'params' | 'headers' | 'body' | 'auth' | 'script';

export const RequestPanel: React.FC<RequestPanelProps> = ({ tab }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('params');
  const updateTab = useRequestStore((state) => state.updateTab);
  const sendRequest = useRequestStore((state) => state.sendActiveRequest);
  const isSendingMap = useRequestStore((state) => state.isSending);
  const isSending = isSendingMap[tab.id] || false;

  const handleUpdate = (patch: Partial<RequestTab>) => {
    updateTab(tab.id, patch);
  };

  const activeParamsCount = tab.params.filter(p => p.enabled && p.key).length;
  const activeHeadersCount = tab.headers.filter(h => h.enabled && h.key).length;
  
  let bodyIndicator = '';
  if (tab.body.type === 'raw') bodyIndicator = 'Raw';
  if (tab.body.type === 'form-data') bodyIndicator = 'Form';
  if (tab.body.type === 'x-www-form-urlencoded') bodyIndicator = 'URL';

  return (
    <div className="request-panel">
      <RequestBuilder
        tab={tab}
        onChange={handleUpdate}
        onSend={sendRequest}
        isSending={isSending}
      />
      
      <div className="request-subtabs-bar">
        <button
          className={`subtab-btn ${activeSubTab === 'params' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('params')}
        >
          Params {activeParamsCount > 0 && <span className="subtab-badge">{activeParamsCount}</span>}
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'headers' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('headers')}
        >
          Headers {activeHeadersCount > 0 && <span className="subtab-badge">{activeHeadersCount}</span>}
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'body' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('body')}
        >
          Body {bodyIndicator && <span className="subtab-badge-text">{bodyIndicator}</span>}
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'auth' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('auth')}
        >
          Auth {tab.auth.type !== 'none' && <span className="subtab-badge-dot" />}
        </button>
        <button
          className={`subtab-btn ${activeSubTab === 'script' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('script')}
        >
          Script {tab.script && <span className="subtab-badge-dot" />}
        </button>
      </div>

      <div className="request-subeditor-area">
        {activeSubTab === 'params' && <ParamsEditor tab={tab} onChange={handleUpdate} />}
        {activeSubTab === 'headers' && <HeadersEditor tab={tab} onChange={handleUpdate} />}
        {activeSubTab === 'body' && <BodyEditor tab={tab} onChange={handleUpdate} />}
        {activeSubTab === 'auth' && <AuthEditor tab={tab} onChange={handleUpdate} />}
        {activeSubTab === 'script' && (
          <ScriptEditor
            script={tab.script || ''}
            onChange={(script) => handleUpdate({ script })}
          />
        )}
      </div>
    </div>
  );
};
