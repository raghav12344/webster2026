import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import WorkflowEditor from './components/WorkflowEditor';
import ObservabilityView from './components/ObservabilityView';
import {
  RotateCcw,
  Sun,
  Moon,
  Layout,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('editor'); // 'landing' | 'editor' | 'observability'
  const [theme, setTheme] = useState('light'); // Apple light mode by default
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);

  // Apply theme to document attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Initial data fetch
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setSystemHealth(data))
      .catch(console.error);

    fetch('/api/presets')
      .then((r) => r.json())
      .then((data) => {
        setPresets(data);
        if (data && data.length > 0) {
          setSelectedPreset(data[0]);
        }
      })
      .catch(console.error);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--apple-bg)' }}>
      {/* Universal Apple Navigation Bar */}
      <header className="apple-header">
        {/* Brand */}
        <div className="apple-brand" onClick={() => setCurrentView('landing')}>
          <div className="apple-logo-badge">
            <RotateCcw size={15} strokeWidth={2.4} />
          </div>
          <div>
            <span className="apple-brand-title">ChronosFlow</span>
            <span className="apple-breadcrumb-separator">/</span>
            <span className="apple-brand-subtitle">
              {currentView === 'editor' ? 'Workflow Canvas' : currentView === 'observability' ? 'System Observability' : 'Overview'}
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <nav className="apple-nav-links">
          <button
            className={`apple-nav-btn ${currentView === 'landing' ? 'active' : ''}`}
            onClick={() => setCurrentView('landing')}
          >
            <span>Overview</span>
          </button>
          <button
            className={`apple-nav-btn ${currentView === 'editor' ? 'active' : ''}`}
            onClick={() => setCurrentView('editor')}
          >
            <Layout size={13} />
            <span>Editor</span>
          </button>
          <button
            className={`apple-nav-btn ${currentView === 'observability' ? 'active' : ''}`}
            onClick={() => setCurrentView('observability')}
          >
            <Activity size={13} />
            <span>Observability</span>
          </button>
        </nav>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Live System Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--apple-text-secondary)', marginRight: '8px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--apple-green)' }} />
            <span>{systemHealth?.broker?.mode?.includes('External') ? 'RabbitMQ Active' : 'AMQP Ready'}</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            className="apple-btn-icon"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {currentView !== 'editor' && (
            <button
              className="apple-btn-primary"
              onClick={() => setCurrentView('editor')}
              style={{ fontSize: '12px' }}
            >
              <span>Open Canvas</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </header>

      {/* Main Body View */}
      {currentView === 'landing' && (
        <LandingPage
          onOpenEditor={() => setCurrentView('editor')}
          onSelectPreset={(p) => {
            setSelectedPreset(p);
            setCurrentView('editor');
          }}
          presets={presets}
          isDarkMode={theme === 'dark'}
        />
      )}

      {currentView === 'editor' && (
        <WorkflowEditor
          presets={presets}
          selectedPreset={selectedPreset}
          onSelectPreset={setSelectedPreset}
          onPresetsUpdated={setPresets}
          onOpenObservability={() => setCurrentView('observability')}
        />
      )}

      {currentView === 'observability' && (
        <ObservabilityView
          onOpenEditor={() => setCurrentView('editor')}
          onSelectPreset={(pId) => {
            const found = presets.find((p) => p.id === pId);
            if (found) setSelectedPreset(found);
          }}
        />
      )}
    </div>
  );
}
