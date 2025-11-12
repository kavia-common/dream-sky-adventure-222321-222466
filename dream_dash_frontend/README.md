# Dream Sky Adventure — Frontend

A lightweight React game prototype with layered Canvas rendering and Ocean Professional theme.

## Play the Game

- Start: `npm start` then open http://localhost:3000
- Goal: Collect as many glowing stars as you can in 60 seconds.

## Controls

- Keyboard:
  - Move Left: ArrowLeft or A
  - Move Right: ArrowRight or D
  - Jump: Space or ArrowUp (debounced)
- Touch:
  - Left half: move left
  - Right half: move right
  - Bottom band: jump (tap)

## Features

- Layered canvases: background (sky + clouds), mid (stars), player, UI overlay
- Simple physics: gravity, friction, jump impulse, ground line and world bounds
- Collectibles: glowing stars that drift; collecting increments score and flashes a glow
- HUD: score and timer displayed in the top bar
- Session: 60-second countdown; modal shows final score and restart button
- Accessibility: ARIA labels on HUD and overlay; focus ring on buttons
- Reduced motion: lowers animation FPS when prefers-reduced-motion is set
- Responsive: 16:9 game area scales to fit the container with DPR-aware rendering

## Theming

Theme tokens are defined in `src/styles/global.css` and leverage `assets/common.css`.
Primary: `#2563EB`, Accent/Success: `#F59E0B`, Error: `#EF4444`, Background: `#f9fafb`, Surface: `#ffffff`, Text: `#111827`.

## Logging

Controlled via `REACT_APP_LOG_LEVEL` (`info` or `debug`). Defaults to `info`.

## Design Placeholder

A design extraction placeholder page is available at `/assets/figma-readme.html`.
