import React from 'react';

/**
 * PUBLIC_INTERFACE
 * Hud displays score and time remaining in the top bar.
 * @param {{score:number, timeLeft:number}} props
 */
export default function Hud({ score, timeLeft }) {
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="hud-group" role="group" aria-label="Score and timer">
      <div className="hud-chip" aria-live="polite" aria-label={`Score ${score}`}>
        <span className="label">Score</span>
        <span>{score}</span>
      </div>
      <div className="hud-chip" aria-live="polite" aria-label={`Time ${mm}:${ss}`}>
        <span className="label">Time</span>
        <span>{mm}:{ss}</span>
      </div>
    </div>
  );
}
