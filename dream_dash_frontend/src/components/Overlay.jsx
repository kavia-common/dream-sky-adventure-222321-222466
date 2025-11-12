import React, { useEffect, useRef } from 'react';

/**
 * PUBLIC_INTERFACE
 * Overlay shows final score and a restart button when time is up.
 * @param {{score:number, onRestart:()=>void}} props
 */
export default function Overlay({ score, onRestart }) {
  const btnRef = useRef(null);

  useEffect(() => {
    // focus trap minimal: focus the primary button on mount
    btnRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Session complete">
      <div className="modal">
        <h2 style={{ color: 'var(--primary)' }}>Great Run!</h2>
        <p>Your final score</p>
        <div className="hud-chip" style={{ margin: '10px auto 18px', justifyContent: 'center' }}>
          <span className="label">Score</span>
          <span>{score}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button ref={btnRef} className="btn" onClick={onRestart} aria-label="Restart the game">
            Restart
          </button>
          <a className="btn secondary" href="/assets/figma-readme.html" target="_blank" rel="noreferrer" aria-label="Open placeholder design readme">
            Design Readme
          </a>
        </div>
      </div>
    </div>
  );
}
