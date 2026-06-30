import React, { useRef, useState, useEffect } from 'react';
import type { RequestTab, HttpMethod } from '../../types/request';
import { useRequestStore } from '../../stores/requestStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { parseCurlCommand } from '../../utils/curlParser';
import './RequestBuilder.css';

interface RequestBuilderProps {
  tab: RequestTab;
  onChange: (patch: Partial<RequestTab>) => void;
  onSend: () => void;
  isSending: boolean;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'QUERY'];

export const RequestBuilder: React.FC<RequestBuilderProps> = ({ tab, onChange, onSend, isSending }) => {
  const [showToast, setShowToast] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Focus URL on Ctrl+L
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        urlInputRef.current?.focus();
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        onSend();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSend]);

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (tab.url.trim() === '' && text.trim().startsWith('curl ')) {
      e.preventDefault();
      const parsed = parseCurlCommand(text);
      onChange(parsed);
      
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    onChange({ url: newUrl });
  };

  // Variable highlighting overlay
  const renderHighlightedUrl = () => {
    const collectionVars = tab.collectionId ? useCollectionStore.getState().getCollectionVariables(tab.collectionId) : {};
    const resolvedVars = useEnvironmentStore.getState().resolveVariables(collectionVars);

    const regex = /\{\{([^}]+)\}\}/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(tab.url)) !== null) {
      if (match.index > lastIndex) {
        parts.push(tab.url.substring(lastIndex, match.index));
      }
      const varName = match[1];
      const isResolved = Object.prototype.hasOwnProperty.call(resolvedVars, varName);
      
      parts.push(
        <mark 
          key={match.index} 
          className={isResolved ? "url-variable" : "url-variable-unresolved"}
          title={isResolved ? resolvedVars[varName] : 'Unresolved variable'}
          onMouseDown={(e) => {
            // Prevent default to avoid losing focus
            e.preventDefault();
            urlInputRef.current?.focus();
          }}
        >
          {match[0]}
        </mark>
      );
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < tab.url.length) {
      parts.push(tab.url.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="request-builder">
      <div className="rb-method-wrap">
        <select
          value={tab.method}
          onChange={(e) => onChange({ method: e.target.value as HttpMethod })}
          className={`rb-method-select method-${tab.method.toLowerCase()}`}
        >
          {METHODS.map(m => (
            <option key={m} value={m} className={`method-${m.toLowerCase()}`}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="rb-url-wrap">
        <div className="rb-url-highlighter" aria-hidden="true">
          {renderHighlightedUrl()}
        </div>
        <input
          ref={urlInputRef}
          type="text"
          className="rb-url-input"
          value={tab.url}
          onChange={handleUrlChange}
          onPaste={handleUrlPaste}
          placeholder="Enter URL or paste curl command"
          spellCheck={false}
        />
        {showToast && <div className="rb-toast">Imported from curl</div>}
      </div>

      <div className="rb-actions">
        <button
          className="rb-redirect-toggle"
          title={tab.followRedirects ? 'Follow redirects: ON' : 'Follow redirects: OFF'}
          onClick={() => onChange({ followRedirects: !tab.followRedirects })}
          style={{ opacity: tab.followRedirects ? 1 : 0.5 }}
        >
          ↻
        </button>
        <button
          className="primary-btn"
          onClick={onSend}
          disabled={isSending || !tab.url.trim()}
        >
          {isSending ? (
            <>
              <span className="spinner">↻</span> Sending
            </>
          ) : (
            'Send'
          )}
        </button>
        <button
          className="secondary-btn"
          onClick={() => useRequestStore.getState().saveActiveRequest()}
          title="Save Request (Ctrl+S)"
        >
          Save
        </button>
      </div>
    </div>
  );
};
