import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm";

const boardEl = document.querySelector("#board");
const sideEl = document.querySelector("#side");
const difficultyEl = document.querySelector("#difficulty");
const difficultyTitleEl = document.querySelector("#difficultyTitle");
const eloValueEl = document.querySelector("#eloValue");
const newGameBtn = document.querySelector("#newGame");
const clearMovesBtn = document.querySelector("#clearMoves");
const statusEl = document.querySelector("#gameStatus");
const moveInfoEl = document.querySelector("#moveInfo");
const movesEl = document.querySelector("#moves");
const engineStatusEl = document.querySelector("#engineStatus");
const promotionDialog = document.querySelector("#promotionDialog");

const pieceAssets = {
  w:{
    k:"./assets/white/king_white.png?v=20261006",
    q:"./assets/white/queen_white.png?v=20261006",
    r:"./assets/white/rook_white.png?v=20261006",
    b:"./assets/white/bishop_white.png?v=20261006",
    n:"./assets/white/knight_white.png?v=20261006",
    p:"./assets/white/pawn_white.png?v=20261006"
  },
  b:{
    k:"./assets/black/king_black.png?v=20261006",
    q:"./assets/black/queen_black.png?v=20261006",
    r:"./assets/black/rook_black.png?v=20261006",
    b:"./assets/black/bishop_black.png?v=20261006",
    n:"./assets/black/knight_black.png?v=20261006",
    p:"./assets/black/pawn_black.png?v=20261006"
  }
};

let game = new Chess();
let playerColor = sideEl.value;
let selectedSquare = null;
let legalMoves = [];
let pendingPromotion = null;
let engineBusy = false;
let engine;
let engineReady = false;

function getElo(){
  return Number(difficultyEl.value);
}

function difficultyTitle(elo){
  if(elo < 1450) return "Casual";
  if(elo < 1650) return "Beginner";
  if(elo < 1900) return "Intermediate";
  if(elo < 2200) return "Advanced";
  if(elo < 2500) return "Expert";
  if(elo < 2800) return "Master";
  return "Grandmaster";
}

function updateDifficultyDisplay(){
  const elo = getElo();
  eloValueEl.textContent = elo;
  difficultyTitleEl.textContent = difficultyTitle(elo);
  difficultyEl.setAttribute("aria-valuetext", elo + " Elo — " + difficultyTitle(elo));
}

function configureEngineStrength(){
  if(!engine || !engineReady) return;
  engine.postMessage("setoption name UCI_LimitStrength value true");
  engine.postMessage("setoption name UCI_Elo value " + getElo());
}

function makeEngine(){
  if(engine){ try{ engine.terminate(); }catch{} }
  engineReady = false;
  engine = new Worker("./stockfish-19-lite-single.js");
  engine.onmessage = handleEngineMessage;
  engine.onerror = () => {
    engineStatusEl.textContent = "Engine failed to load. Try refreshing the page.";
    engineBusy = false;
    engineReady = false;
  };
  engine.postMessage("uci");
  engine.postMessage("isready");
}

function handleEngineMessage(event){
  const line = String(event.data);
  if(line === "readyok"){
    engineReady = true;
    configureEngineStrength();
    engineStatusEl.textContent = "Stockfish ready";
    if(game.turn() !== playerColor && !game.isGameOver()) requestEngineMove();
    return;
  }
  if(line.startsWith("bestmove")){
    const best = line.split(/\s+/)[1];
    if(best && best !== "(none)" && engineBusy){
      try{ game.move({from:best.slice(0,2),to:best.slice(2,4),promotion:best[4] || "q"}); }
      catch(e){ console.error(e); }
      engineBusy = false;
      render();
      updateStatus();
    }else{
      engineBusy = false;
      updateStatus();
    }
  }
}

function requestEngineMove(){
  if(engineBusy || !engineReady || game.isGameOver() || game.turn() === playerColor) return;
  engineBusy = true;
  selectedSquare = null;
  legalMoves = [];
  engineStatusEl.textContent = "Stockfish is thinking…";
  // Do not reset the engine between moves. Reinitializing the search
  // state on every turn adds unnecessary overhead and can make the browser
  // engine feel sluggish. The strength option is already configured when
  // the engine becomes ready (and when the slider changes).
  engine.postMessage("position fen " + game.fen());
  // Keep response time short and predictable. Higher Elo gets a little
  // more search time, but even the maximum is kept well below one second.
  const elo = getElo();
  const movetime = Math.round(150 + ((elo - 1320) / (3190 - 1320)) * 350);
  engine.postMessage("go movetime " + movetime);
  render();
}

function resetGame(){
  game = new Chess();
  playerColor = sideEl.value;
  selectedSquare = null;
  legalMoves = [];
  pendingPromotion = null;
  engineBusy = false;
  render();
  makeEngine();
  updateStatus();
}

function squareName(file, rank){
  return file + rank;
}

function render(){
  boardEl.innerHTML = "";
  const files = playerColor === "w" ? ["a","b","c","d","e","f","g","h"] : ["h","g","f","e","d","c","b","a"];
  const ranks = playerColor === "w" ? ["8","7","6","5","4","3","2","1"] : ["1","2","3","4","5","6","7","8"];

  for(let r=0;r<8;r++){
    for(let f=0;f<8;f++){
      const file = files[f], rank = ranks[r], square = squareName(file,rank);
      const el = document.createElement("button");
      el.type = "button";
      el.className = "square " + (((r+f)%2===0) ? "light" : "dark");
      el.dataset.square = square;

      if(selectedSquare === square) el.classList.add("selected");
      const move = legalMoves.find(m => m.to === square);
      if(move) el.classList.add(move.captured ? "capture" : "legal");

      const piece = game.get(square);
      if(piece){
        const img = document.createElement("img");
        img.className = "piece-image";
        img.src = pieceAssets[piece.color][piece.type];
        img.alt = piece.color === "w" ? "White " + piece.type : "Black " + piece.type;
        img.draggable = false;
        el.appendChild(img);
      }

      if(rank === (playerColor === "w" ? "1" : "8")){
        const c = document.createElement("span");
        c.className = "coord-file";
        c.textContent = file;
        el.appendChild(c);
      }
      if(file === (playerColor === "w" ? "a" : "h")){
        const c = document.createElement("span");
        c.className = "coord-rank";
        c.textContent = rank;
        el.appendChild(c);
      }

      el.addEventListener("click", () => handleSquareClick(square));
      boardEl.appendChild(el);
    }
  }
  renderMoves();
  updateStatus();
}

function handleSquareClick(square){
  if(engineBusy || game.isGameOver() || game.turn() !== playerColor) return;

  if(selectedSquare){
    const candidate = legalMoves.find(m => m.to === square);
    if(candidate){
      if(candidate.piece === "p" && (square.endsWith("8") || square.endsWith("1"))){
        pendingPromotion = {from:selectedSquare,to:square};
        promotionDialog.showModal();
        return;
      }
      playMove(selectedSquare, square);
      return;
    }
  }

  const piece = game.get(square);
  if(piece && piece.color === playerColor){
    selectedSquare = square;
    legalMoves = game.moves({square, verbose:true});
  }else{
    selectedSquare = null;
    legalMoves = [];
  }
  render();
}

function playMove(from,to,promotion="q"){
  try{
    game.move({from,to,promotion});
  }catch(error){
    console.error(error);
    return;
  }
  selectedSquare = null;
  legalMoves = [];
  pendingPromotion = null;
  render();
  if(!game.isGameOver() && game.turn() !== playerColor) requestEngineMove();
}

promotionDialog.addEventListener("close", () => {
  if(!pendingPromotion) return;
  const promotion = promotionDialog.returnValue || "q";
  const move = pendingPromotion;
  pendingPromotion = null;
  playMove(move.from, move.to, promotion);
});

function renderMoves(){
  movesEl.innerHTML = "";
  const history = game.history();
  for(let i=0;i<history.length;i+=2){
    const li = document.createElement("li");
    const white = document.createElement("span");
    white.textContent = history[i] || "";
    li.appendChild(white);
    if(history[i+1]){
      li.appendChild(document.createTextNode("  " + history[i+1]));
    }
    movesEl.appendChild(li);
  }
  movesEl.scrollTop = movesEl.scrollHeight;
}

function updateStatus(){
  const turnName = game.turn() === "w" ? "White" : "Black";
  moveInfoEl.textContent = turnName + " to move";

  if(game.isCheckmate()){
    const winner = game.turn() === "w" ? "Black" : "White";
    statusEl.textContent = winner + " wins — checkmate";
    engineStatusEl.textContent = "Game over";
  }else if(game.isStalemate()){
    statusEl.textContent = "Draw — stalemate";
    engineStatusEl.textContent = "Game over";
  }else if(game.isThreefoldRepetition()){
    statusEl.textContent = "Draw — repetition";
    engineStatusEl.textContent = "Game over";
  }else if(game.isInsufficientMaterial()){
    statusEl.textContent = "Draw — insufficient material";
    engineStatusEl.textContent = "Game over";
  }else if(game.isDraw()){
    statusEl.textContent = "Draw";
    engineStatusEl.textContent = "Game over";
  }else if(game.isCheck()){
    statusEl.textContent = (game.turn() === playerColor ? "Your turn" : "Stockfish's turn") + " — check";
  }else{
    statusEl.textContent = game.turn() === playerColor ? "Your turn" : "Stockfish's turn";
  }
}

sideEl.addEventListener("change", resetGame);
difficultyEl.addEventListener("input", () => {
  updateDifficultyDisplay();
});
difficultyEl.addEventListener("change", () => {
  updateDifficultyDisplay();
  if(!game.isGameOver() && game.turn() !== playerColor){
    engineBusy = false;
    configureEngineStrength();
    requestEngineMove();
  }
});
newGameBtn.addEventListener("click", resetGame);
clearMovesBtn.addEventListener("click", () => {
  game = new Chess();
  selectedSquare = null;
  legalMoves = [];
  engineBusy = false;
  render();
  makeEngine();
});

updateDifficultyDisplay();
resetGame();
