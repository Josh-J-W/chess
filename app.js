import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm";

const boardEl = document.querySelector("#board");
const sideEl = document.querySelector("#side");
const difficultyEl = document.querySelector("#difficulty");
const newGameBtn = document.querySelector("#newGame");
const clearMovesBtn = document.querySelector("#clearMoves");
const statusEl = document.querySelector("#gameStatus");
const moveInfoEl = document.querySelector("#moveInfo");
const movesEl = document.querySelector("#moves");
const engineStatusEl = document.querySelector("#engineStatus");
const promotionDialog = document.querySelector("#promotionDialog");

const pieces = {
  w:{k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"},
  b:{k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"}
};

let game = new Chess();
let playerColor = sideEl.value;
let selectedSquare = null;
let legalMoves = [];
let pendingPromotion = null;
let engineBusy = false;
let engine;

function makeEngine(){
  if(engine){ try{ engine.terminate(); }catch{} }
  engine = new Worker("./stockfish-19-asm.js");
  engine.onmessage = handleEngineMessage;
  engine.onerror = () => {
    engineStatusEl.textContent = "Engine failed to load. Try refreshing the page.";
    engineBusy = false;
  };
  engine.postMessage("uci");
  engine.postMessage("isready");
}

function handleEngineMessage(event){
  const line = String(event.data);
  if(line === "readyok"){
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
      if(!game.isGameOver() && game.turn() === playerColor) updateStatus();
      else updateStatus();
    }else{
      engineBusy = false;
      updateStatus();
    }
  }
}

function requestEngineMove(){
  if(engineBusy || game.isGameOver() || game.turn() === playerColor) return;
  engineBusy = true;
  selectedSquare = null;
  legalMoves = [];
  engineStatusEl.textContent = "Stockfish is thinking…";
  engine.postMessage("ucinewgame");
  engine.postMessage("position fen " + game.fen());
  engine.postMessage("go depth " + Number(difficultyEl.value));
  render();
}

function skillForDepth(depth){
  if(depth <= 8) return 4;
  if(depth <= 13) return 12;
  return 20;
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
        const span = document.createElement("span");
        span.className = "piece " + (piece.color === "w" ? "white" : "black");
        span.textContent = pieces[piece.color][piece.type];
        el.appendChild(span);
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
difficultyEl.addEventListener("change", () => {
  if(!game.isGameOver() && game.turn() !== playerColor){
    engineBusy = false;
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

resetGame();
