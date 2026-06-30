import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { Modal } from './Modal';

export const PromptModal: React.FC = () => {
  const { promptConfig, closePrompt } = useUIStore();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (promptConfig) {
      setValue(promptConfig.defaultValue || '');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [promptConfig]);

  if (!promptConfig) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    promptConfig.resolve(value);
    closePrompt();
  };

  const handleClose = () => {
    promptConfig.resolve(null);
    closePrompt();
  };

  return (
    <Modal title={promptConfig.title} onClose={handleClose} isOpen={true}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '350px' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={promptConfig.placeholder}
          style={{ width: '100%', padding: '0.5rem', fontSize: '1rem' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="secondary-btn" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="primary-btn">
            {promptConfig.submitText || 'OK'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
