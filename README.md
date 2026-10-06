# Chess vs Stockfish

A standalone, responsive chess page designed to run on GitHub Pages.

## Features

- Play as White or Black
- Easy / Medium / Hard Stockfish difficulty
- Legal move validation
- Castling, en passant, promotion, check, checkmate, stalemate, and draw detection
- Responsive board
- No backend required

## Libraries

- [chess.js](https://github.com/jhlywa/chess.js) 1.4.0 — BSD-2-Clause
- [Stockfish.js](https://github.com/nmrugg/stockfish.js) 10.0.2 WASM build — GPL-3.0

Stockfish is downloaded by the GitHub Pages deployment workflow and included in the deployed site as a local browser worker. This avoids depending on a third-party CDN at runtime. The deployment uses the Stockfish.js 19.0.0 ASM-JS build for maximum browser compatibility; it is slower than WASM but substantially easier to deploy reliably through GitHub Pages.

## GitHub Pages

This repository is intentionally a plain static site: `index.html` is the entry point and no build step is required.

In GitHub, open **Settings → Pages**, choose **GitHub Actions** as the source, then select the workflow named **Deploy chess site to GitHub Pages**. The workflow downloads the Stockfish browser engine and publishes the complete site.

Your page will be available at:

`https://Josh-J-W.github.io/chess/`
