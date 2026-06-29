import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import './ScriptEditor.css';

interface ScriptEditorProps {
  script: string;
  onChange: (script: string) => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ script, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: script,
      extensions: [
        lineNumbers(),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, indentWithTab]),
        javascript(),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
      ],
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
    // We only want to initialize the editor once. The updateListener handles propagating changes.
    // If we wanted to support external changes to the script we'd need to sync it back, but
    // for this component we assume it is the source of truth while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="script-editor-container">
      <div className="se-header">
        <p className="se-helper-text">
          Write JavaScript to execute after the request. Use <code>response</code> (status, headers, body, time) and <code>env.set("key", "value")</code>.
        </p>
      </div>
      <div className="se-editor-wrap" ref={editorRef} />
    </div>
  );
};
