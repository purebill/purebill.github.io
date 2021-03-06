function v(x, y) {
  return new Vector(x, y);
}

function $(id) {
  return document.getElementById(id);
}

const worker = new Workerp("worker.js");

let state = {
  board: null,
  hint: [],
  w: 8,
  h: 7,
  fCount: 4,
  onChanged: () => {
    $('wValue').innerText = state.w;
    $('hValue').innerText = state.h;
    $('fCountValue').innerText = state.fCount;
  },
  clear: () => {
    state.buildBoard();
    state.showBoard();
  },
  buildBoard: () => {
    const b = new Board(state.w, state.h);
    state.board = b;
    state.hint = [];
  },
  showBoard: () => {
    let table = document.getElementById("board");
    table.innerHTML = "";
    for (let row = 0; row < state.h; row++) {
      const tr = document.createElement("tr");

      for (let col = 0; col < state.w; col++) {
        const v = state.board.get(col, row);

        const td = document.createElement("td");
        td.classList.add("color" + v);

        td.innerHTML = v == 0 ? "" : v;
        if (v == -1) td.classList.add("wall");

        if (state.hint.find(v => v.x == col && v.y == row) !== undefined) {
          td.classList.add("hint");
        }

        td.addEventListener("click", (e) => {
          e.preventDefault();

          if (state.board.get(col, row) == -1) state.board.set(col, row, 0);
          else state.board.set(col, row, -1);
          state.showBoard();
        });

        td.addEventListener("contextmenu", (e) => {
          e.preventDefault();

          if (state.board.get(col, row) != 0) return;

          let idx = state.hint.findIndex(v => v.x == col && v.y == row);
          if (idx == -1) {
            state.hint.push(new Vector(col, row));
            td.classList.add("hint");
          } else {
            state.hint.splice(idx, 1);
            td.classList.remove("hint");
          }
        });

        tr.appendChild(td);
      }

      table.appendChild(tr);
    }
  },
  stop: () => {
    worker.reset();
    $("btnSolve").disabled = false;
    $("btnStop").disabled = true;
},
  solve: () => {
    $("btnSolve").disabled = true;
    $("btnStop").disabled = false;

    // console.log(state.board.toString());
    // console.log(state.fCount);

    let filterFigure = null;
    
    if (state.hint.length > 0) {
      let v0 = state.hint[0];
      let vectors = state.hint.slice(1).map(v => new Vector(v.x - v0.x, v.y - v0.y));
      filterFigure = new Figure(vectors);
    }
    
    worker.call({
      boardPojo: state.board.toPojo(),
      fCount: state.fCount,
      filterFigurePojo: filterFigure !== null ? filterFigure.toPojo() : null
    }).then(solutionPojo => {
      $("btnSolve").disabled = false;
      $("btnStop").disabled = true;
      if (solutionPojo !== null) {
        state.board = Board.fromPojo(solutionPojo);
        state.showBoard();
      }
    });
  }
};
StateUi(state);
state.buildBoard();

const b = state.board;
let y = 0;	
"-1 -1 -1 0 0 -1 -1 -1".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));	
y++;	
"-1 -1 -1 -1 0 -1 -1 -1".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));	
y++;	
"-1 -1 -1 0 0 0 0 -1".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));	
y++;	
"-1 0 0 0 0 0 0 -1".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));	
y++;	
"-1 0 0 0 0 0 0 0".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));	
y++;	
"0 0 0 0 0 0 -1 -1".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));	
y++;	
"-1 -1 0 0 -1 -1 -1 -1".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));
state.showBoard();