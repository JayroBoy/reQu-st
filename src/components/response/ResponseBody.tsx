import React, { useState, useEffect, useRef } from 'react';
import type { RequestResponse } from '../../types/response';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';
import './ResponseBody.css';

interface ResponseBodyProps {
  response: RequestResponse;
}

type BodyTab = 'pretty' | 'raw' | 'preview';

export const ResponseBody: React.FC<ResponseBodyProps> = ({ response }) => {
  const [activeTab, setActiveTab] = useState<BodyTab>('pretty');
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const getContentType = () => {
    const ctHeader = response.headers.find(h => h.key.toLowerCase() === 'content-type');
    return ctHeader ? ctHeader.value.toLowerCase() : '';
  };

  const contentType = getContentType();
  const isJson = contentType.includes('application/json');
  const isHtml = contentType.includes('text/html');

  useEffect(() => {
    if (activeTab !== 'pretty' || !editorRef.current) {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      return;
    }

    let formattedBody = response.body;
    let extensions = [
      lineNumbers(),
      EditorView.lineWrapping,
      EditorState.readOnly.of(true),
      oneDark
    ];

    if (isJson) {
      try {
        formattedBody = JSON.stringify(JSON.parse(response.body), null, 2);
        extensions.push(json());
      } catch (e) {
        // Invalid JSON, fallback to raw text
      }
    } else if (contentType.includes('javascript')) {
      extensions.push(javascript());
    }

    const state = EditorState.create({
      doc: formattedBody,
      extensions,
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [activeTab, response.body, isJson, contentType]);

  return (
    <div className="response-body">
      <div className="rb-sub-tabs">
        <button
          className={activeTab === 'pretty' ? 'active' : ''}
          onClick={() => setActiveTab('pretty')}
        >
          Pretty
        </button>
        <button
          className={activeTab === 'raw' ? 'active' : ''}
          onClick={() => setActiveTab('raw')}
        >
          Raw
        </button>
        {isHtml && (
          <button
            className={activeTab === 'preview' ? 'active' : ''}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </button>
        )}
      </div>

      <div className="rb-content-container">
        {activeTab === 'pretty' && (
          <div className="rb-cm-container" ref={editorRef} />
        )}
        
        {activeTab === 'raw' && (
          <textarea
            className="rb-raw-textarea"
            readOnly
            value={response.body}
          />
        )}

        {activeTab === 'preview' && isHtml && (
          <iframe
            title="response-preview"
            className="rb-preview-iframe"
            srcDoc={response.body}
            sandbox="allow-same-origin"
          />
        )}
      </div>
    </div>
  );
};
