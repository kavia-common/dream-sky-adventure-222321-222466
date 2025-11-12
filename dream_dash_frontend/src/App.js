import React, { useMemo, useState } from 'react';
import './styles/global.css';
import Hud from './components/Hud';
import GameCanvas from './components/GameCanvas';
import Overlay from './components/Overlay';

// PUBLIC_INTERFACE
function App() {
  /** App-level session state */
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);

  const logLevel = (process.env.REACT_APP_LOG_LEVEL || 'info').toLowerCase();
  const logger = useMemo(() => {
    return {
      info: (...args) => (logLevel === 'info' || logLevel === 'debug') && console.log('[info]', ...args),
      debug: (...args) => (logLevel === 'debug') && console.debug('[debug]', ...args),
      warn: (...args) => console.warn('[warn]', ...args),
      error: (...args) => console.error('[error]', ...args),
    };
  }, [logLevel]);

  // PUBLIC_INTERFACE
  const handleTick = (sec) => {
    // Called by game loop hook once per second
    setTimeLeft((prev) => {
      const next = Math.max(0, prev - sec);
      if (next === 0 && running) {
        setRunning(false);
        setShowOverlay(true);
        logger.info('Session ended. Final score:', score);
      }
      return next;
    });
  };

  // PUBLIC_INTERFACE
  const handleScore = (delta) => {
    setScore((s) => s + delta);
  };

  // PUBLIC_INTERFACE
  const handleRestart = () => {
    setScore(0);
    setTimeLeft(60);
    setRunning(true);
    setShowOverlay(false);
  };

  return (
    <div className="app-shell" role="application" aria-label="Dream Sky Adventure">
      <header className="topbar" aria-label="HUD top bar">
        <div className="topbar-inner">
          <div className="brand" aria-label="Game title">
            <span className="dot" aria-hidden="true"></span>
            Dream Sky Adventure
          </div>
          <Hud score={score} timeLeft={timeLeft} />
        </div>
      </header>

      <main className="content">
        <div className="game-wrapper" aria-live="polite">
          <GameCanvas
            running={running}
            onScore={handleScore}
            onTick={handleTick}
            logger={logger}
          />
          {showOverlay && (
            <Overlay
              score={score}
              onRestart={handleRestart}
            />
          )}
        </div>
      </main>

      <footer className="footer">
        <span>
          Need help? See design placeholder &nbsp;
          <a href="/assets/figma-readme.html" target="_blank" rel="noreferrer">figma-readme.html</a>
        </span>
      </footer>
    </div>
  );
}

export default App;
