let board = new Board2(1000, 1000);
let generation = 0;

const canvas = document.getElementById("result");
canvas.width = board.w;
canvas.height = board.h;
const ctx = canvas.getContext("2d");
// put(1, 1,
//   [
//     [0, 1, 0],
//     [1, 0, 0],
//     [1, 1, 1],
//   ]);
// console.log(board.toString());
// for (let i = 0; i < 10; i++) {
//   board.step();
//   console.log(board.toString());
// }
// exit();
// put(3, 3,
//   [
//     [0, 1, 0],
//     [1, 0, 0],
//     [1, 1, 1],
//   ]);
put(Math.round(board.w / 2), Math.round(board.h / 2),
  [
    [0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [1, 1, 0, 0, 1, 1, 1],
  ]);
//random(0.05);

const worker = new Workerp("worker.js");
worker.call({board: Serialization.serialize(board)}).then(show).then(main);

let stopped = true;
let draw = false;
let mean = 0;
function cycle() {
  if (stopped) return;

  const start = new Date().getTime();
  worker.call({step: true})
    .then(() => {
      generation++;
      const end = new Date().getTime();
      mean = (mean + (end - start)) / 2;
      if (draw) {
        worker.call({})
          .then((imageData) => {
            requestAnimationFrame(() => ctx.putImageData(imageData, 0, 0));
            draw = false;
          })
          .then(cycle);
      } else cycle();
    });
}

setInterval(() => {
  draw = true;
}, 100);

setInterval(() => {
  const info = document.getElementById("info");
  info.innerHTML = 
      "<p>Generation: " + generation + "</p>" +
      "<p>Speed: " + Math.round(1000 / mean) + " generations/sec";
  
  if (mean > 100 && board instanceof Board2) {
    console.log("switching backend");
    let boardNext = new Board(board.w, board.h);
    for (let y = 0; y < board.h; y++) {
      for (let x = 0; x < board.w; x++) {
        if (board.get(x, y)) boardNext.set(x, y, 1);
      }
    }
    board = boardNext;
    worker.call({board: Serialization.serialize(board)}).then(show).then(() => console.log("switched"));
  }
}, 1000);

canvas.onclick = () => {
  stopped = !stopped;
  cycle();
}

function show() {
  worker.call({})
    .then((imageData) => {
      requestAnimationFrame(() => ctx.putImageData(imageData, 0, 0));
    });
}

function main() {
  Keys.init(canvas);
  Keys.key("Space", [], "Step", () => {
    worker.call({step: true})
      .then(() => generation++)
      .then(show);
  });
}


function random(probability) {
  for (let y = 0; y < board.h; y++) {
    for (let x = 0; x < board.w; x++) {
      board.set(x, y, Math.random() < probability ? 1 : 0);
    }
  }
}


function put(x, y, figure) {
  for (let r = 0; r < figure.length; r++) {
    const a = figure[r];
    for (let c = 0; c < a.length; c++) {
      board.set(x + c, y + r, a[c]);
    }
  }
}
