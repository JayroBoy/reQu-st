import React, { useState } from 'react';
import type { RequestTab } from '../../types/request';
import './AuthEditor.css';

interface AuthEditorProps {
  tab: RequestTab;
  onChange: (patch: Partial<RequestTab>) => void;
}

export const AuthEditor: React.FC<AuthEditorProps> = ({ tab, onChange }) => {
  const { type, bearer, basic } = tab.auth;
  const [showToken, setShowToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const setAuthType = (newType: typeof type) => {
    onChange({
      auth: { ...tab.auth, type: newType }
    });
  };

  const handleBearerChange = (token: string) => {
    onChange({
      auth: { ...tab.auth, bearer: { token } }
    });
  };

  const handleBasicChange = (field: 'username' | 'password', value: string) => {
    onChange({
      auth: {
        ...tab.auth,
        basic: {
          username: basic?.username ?? '',
          password: basic?.password ?? '',
          [field]: value
        }
      }
    });
  };

  return (
    <div className="auth-editor">
      <div className="auth-sidebar">
        <div className="auth-type-list">
          <button
            className={`auth-type-btn ${type === 'none' ? 'active' : ''}`}
            onClick={() => setAuthType('none')}
          >
            No Auth
          </button>
          <button
            className={`auth-type-btn ${type === 'bearer' ? 'active' : ''}`}
            onClick={() => setAuthType('bearer')}
          >
            Bearer Token
          </button>
          <button
            className={`auth-type-btn ${type === 'basic' ? 'active' : ''}`}
            onClick={() => setAuthType('basic')}
          >
            Basic Auth
          </button>
        </div>
      </div>
      
      <div className="auth-content">
        {type !== 'none' && (
          <div className="auth-hint">
            The authorization header will be automatically generated when you send the request.
          </div>
        )}

        {type === 'none' && (
          <div className="auth-empty-state">
            This request does not use any authorization.
          </div>
        )}

        {type === 'bearer' && (
          <div className="auth-form">
            <div className="form-group">
              <label>Token</label>
              <div className="input-with-icon">
                <input
                  type={showToken ? "text" : "password"}
                  value={bearer?.token ?? ''}
                  onChange={(e) => handleBearerChange(e.target.value)}
                  placeholder="Enter Bearer Token"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowToken(!showToken)}
                  title={showToken ? "Hide" : "Show"}
                >
                  {showToken ? "👁" : "👁‍🗨"}
                </button>
              </div>
            </div>
          </div>
        )}

        {type === 'basic' && (
          <div className="auth-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={basic?.username ?? ''}
                onChange={(e) => handleBasicChange('username', e.target.value)}
                placeholder="Username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <input
                  type={showPassword ? "text" : "password"}
                  value={basic?.password ?? ''}
                  onChange={(e) => handleBasicChange('password', e.target.value)}
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide" : "Show"}
                >
                  {showPassword ? "👁" : "👁‍🗨"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
