import React, { useState, useEffect } from 'react';
import type { MainComponentProps, PackageState } from '../types';
import '../styles/package.css';

/**
 * MainComponent - The primary UI for this package
 *
 * This component demonstrates the EVE-OS design system:
 * - iOS Liquid Glass styling
 * - Dark-first color scheme
 * - Supports tab (full page) and panel (sidebar) modes
 *
 * Usage:
 * - Tab mode: <MainComponent mode="tab" />
 * - Panel mode: <MainComponent mode="panel" onClose={() => {}} />
 */

export type ViewMode = 'tab' | 'panel';

export interface ExtendedMainComponentProps extends MainComponentProps {
  mode?: ViewMode;
  onClose?: () => void;
}

export function MainComponent({
  config = {},
  className = '',
  mode = 'tab',
  onClose,
}: ExtendedMainComponentProps) {
  // Component state
  const [state, setState] = useState<PackageState>({
    initialized: false,
    loading: true,
    error: null,
    data: null,
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'features' | 'settings'>('overview');

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Simulate initialization
        await new Promise(resolve => setTimeout(resolve, 500));

        setState((prev) => ({
          ...prev,
          initialized: true,
          loading: false,
          data: {
            stats: {
              total: 42,
              active: 36,
              pending: 4,
              completed: 2,
            },
          },
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Initialization failed',
        }));
      }
    };

    initialize();
  }, []);

  // ============================================
  // Render: Loading State
  // ============================================
  if (state.loading) {
    return (
      <div className={`pkg pkg--${mode} ${className}`}>
        <div className="pkg__loading">
          <div className="pkg__spinner" />
          <p>Loading package...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Error State
  // ============================================
  if (state.error) {
    return (
      <div className={`pkg pkg--${mode} ${className}`}>
        <div className="pkg__empty">
          <span className="pkg__empty-icon">⚠️</span>
          <h3 className="pkg__empty-title">Error</h3>
          <p className="pkg__empty-text">{state.error}</p>
          <button
            className="pkg__btn pkg__btn--secondary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // Render: Main Content
  // ============================================
  return (
    <div className={`pkg pkg--${mode} ${className}`}>
      {/* Header */}
      <header className="pkg__header">
        <div className="pkg__branding">
          <span className="pkg__logo">📦</span>
          <div>
            <h1 className="pkg__title">Package Name</h1>
            <p className="pkg__subtitle">Your package description here</p>
          </div>
        </div>
        <div className="pkg__actions">
          {mode === 'panel' && onClose && (
            <button className="pkg__btn pkg__btn--ghost" onClick={onClose}>
              ✕
            </button>
          )}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="pkg__grid pkg__grid--4" style={{ marginBottom: '1.5rem' }}>
        <div className="pkg__stat">
          <span className="pkg__stat-value">{state.data?.stats?.total || 0}</span>
          <span className="pkg__stat-label">Total</span>
        </div>
        <div className="pkg__stat pkg__stat--success">
          <span className="pkg__stat-value">{state.data?.stats?.active || 0}</span>
          <span className="pkg__stat-label">Active</span>
        </div>
        <div className="pkg__stat pkg__stat--warning">
          <span className="pkg__stat-value">{state.data?.stats?.pending || 0}</span>
          <span className="pkg__stat-label">Pending</span>
        </div>
        <div className="pkg__stat">
          <span className="pkg__stat-value">{state.data?.stats?.completed || 0}</span>
          <span className="pkg__stat-label">Completed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="pkg__tabs">
        <button
          className={`pkg__tab ${activeTab === 'overview' ? 'pkg__tab--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <span>📊</span>
          <span>Overview</span>
        </button>
        <button
          className={`pkg__tab ${activeTab === 'features' ? 'pkg__tab--active' : ''}`}
          onClick={() => setActiveTab('features')}
        >
          <span>✨</span>
          <span>Features</span>
        </button>
        <button
          className={`pkg__tab ${activeTab === 'settings' ? 'pkg__tab--active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="pkg__fade-in">
        {activeTab === 'overview' && (
          <div className="pkg__grid pkg__grid--2">
            <div className="pkg__card">
              <h2 className="pkg__card-title">Welcome!</h2>
              <p className="pkg__card-text">
                This is a template package. Replace this content with your actual
                package functionality. The styling uses the EVE-OS design system.
              </p>
              <button
                className="pkg__btn pkg__btn--primary"
                onClick={() => console.log('Action clicked!', config)}
                style={{ marginTop: '1rem' }}
              >
                Primary Action
              </button>
            </div>

            <div className="pkg__card">
              <h2 className="pkg__card-title">Quick Start</h2>
              <div className="pkg__list">
                <div className="pkg__list-item">
                  <span>1.</span>
                  <span>Update manifest.json</span>
                </div>
                <div className="pkg__list-item">
                  <span>2.</span>
                  <span>Replace this component</span>
                </div>
                <div className="pkg__list-item">
                  <span>3.</span>
                  <span>Add backend routes</span>
                </div>
                <div className="pkg__list-item">
                  <span>4.</span>
                  <span>Test with deploy script</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div>
            <div className="pkg__card" style={{ marginBottom: '1rem' }}>
              <h2 className="pkg__card-title">Design System Components</h2>
              <p className="pkg__card-text">
                This template includes pre-built components that match the EVE-OS style.
              </p>
            </div>

            <div className="pkg__grid pkg__grid--3">
              <div className="pkg__card pkg__card--interactive">
                <h3 className="pkg__card-title">Glass Cards</h3>
                <p className="pkg__card-text">iOS Liquid Glass effect with blur and glow</p>
              </div>
              <div className="pkg__card pkg__card--interactive">
                <h3 className="pkg__card-title">Status Indicators</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span className="pkg__status pkg__status--success">
                    <span className="pkg__status-dot" />
                    Success
                  </span>
                  <span className="pkg__status pkg__status--warning">
                    <span className="pkg__status-dot" />
                    Warning
                  </span>
                </div>
              </div>
              <div className="pkg__card pkg__card--interactive">
                <h3 className="pkg__card-title">Buttons</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button className="pkg__btn pkg__btn--primary">Primary</button>
                  <button className="pkg__btn pkg__btn--secondary">Secondary</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="pkg__card">
            <h2 className="pkg__card-title">Settings</h2>
            <p className="pkg__card-text" style={{ marginBottom: '1rem' }}>
              Configure your package settings here.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a1a1aa' }}>
                  API Endpoint
                </label>
                <input
                  type="text"
                  className="pkg__input"
                  placeholder="http://localhost:8000"
                  defaultValue={config.apiUrl || ''}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#a1a1aa' }}>
                  Refresh Interval (seconds)
                </label>
                <input
                  type="number"
                  className="pkg__input"
                  placeholder="30"
                  defaultValue={config.refreshInterval || 30}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="pkg__btn pkg__btn--primary">Save Settings</button>
                <button className="pkg__btn pkg__btn--secondary">Reset</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MainComponent;
