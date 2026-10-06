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

The first version uses the pinned cdnjs builds so the repository stays lightweight. The engine is loaded locally in the browser and all game state is handled client-side.

## GitHub Pages

This repository is intentionally a plain static site: `index.html` is the entry point and no build step is required.

In GitHub, open **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/(root)**, then save.

Your page will be available at:

`https://Josh-J-W.github.io/chess/`
