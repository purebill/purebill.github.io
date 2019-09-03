class Board {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.cells = [];
    this.filledCount = 0;
    for (let i = 0; i < w*h; i++) this.cells.push(0);
  }

  get(x, y) {
    assert(x >= 0 && x < this.w);
    assert(y >= 0 && y < this.h);

    return this.cells[x + y * this.w];
  }

  set(x, y, value) {
    assert(x >= 0 && x < this.w);
    assert(y >= 0 && y < this.h);

    if (value == 0 && this.cells[x + y * this.w] != 0) this.filledCount--;
    else if (value != 0 && this.cells[x + y * this.w] == 0) this.filledCount++;
    this.cells[x + y * this.w] = value;
  }

  invert() {
    for (let i = 0; i < this.w * this.h; i++) this.cells[i] = (this.cells[i] == 0 ? 1 : 0);
    return this;
  }

  clone() {
    let b = new Board(this.w, this.h);
    b.cells = this.cells.slice();
    b.filledCount = this.filledCount;
    return b;
  }

  filled() {
    return this.filledCount == this.w * this.h;
  }

  placeFigure(/**@type {Figure} */ figure, x, y, idx) {
    this.set(x, y, idx);
    figure.vectors.forEach(v => this.set(x + v.x, y + v.y, idx));
  }

  figureFit(/**@type {Figure} */ figure, x, y) {
    if (this.get(x, y) === 0) {
      for (let v of figure.vectors) {
        let xx = x + v.x;
        let yy = y + v.y;
        if (xx < 0 || xx >= this.w || yy < 0 || yy >= this.h) return false;
        if (this.get(xx, yy) !== 0) return false;
      }
      return true;
    }
  }

  toString() {
    let s = "";
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        s += this.get(x, y);
        if (x < this.w - 1) s += " ";
      }
      s+= "\n";
    }
    return s;
  }
}

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toString() {
    return "(" + this.x + ", " + this.y + ")";
  }
}

class Figure {
  constructor(/**@type {Vector[]} */ vectors) {
    let normalized = vectors.slice();
    normalized.push(new Vector(0, 0));

    let minx = Math.min.apply(null, normalized.map(v => v.x));
    let miny = Math.min.apply(null, normalized.filter(v => v.x == minx).map(v => v.y));

    const dx = -minx;
    const dy = -miny;
    normalized = normalized
      .map(v => new Vector(v.x + dx, v.y + dy))
      .filter(v => v.x !== 0 || v.y !== 0);

    normalized.sort((a, b) => {
      if (a.x < b.x) return -1;
      if (a.x > b.x) return 1;
      if (a.y < b.y) return -1;
      if (a.y > b.y) return 1;
      return 0;
    });

    // assert(normalized.length == vectors.length);

    this.vectors = normalized;
  }

  rotateClockwise() {
    return new Figure(this.vectors.map(v => new Vector(-v.y, v.x)));
  }

  mirror() {
    return new Figure(this.vectors.map(v => new Vector(-v.x, v.y)));
  }

  id() {
    return this.vectors.map(v => "(" + v.x + "," + v.y + ")").join("");
  }

  toBoard() {
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    for (let v of this.vectors) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }

    let w = maxX - minX + 1;
    let h = maxY - minY + 1;

    let b = new Board(w, h);
    b.placeFigure(this, minX < 0 ? -minX : 0, minY < 0 ? -minY : 0, "1");
    return b;
  }

  toString() {
    // console.log(this);
    return this.toBoard().toString();
  }
}

function* fitFigure(/**@type {Board} */ board, /**@type {Figure} */ figure) {
  for (let y = 0; y < board.h; y++) {
    for (let x = 0; x < board.w; x++) {
      if (board.figureFit(figure, x, y)) yield new Vector(x, y);
    }
  }
}

function* makeFigure(size) {
  let vectors = [new Vector(0, 0)];
  let visitedIds = new Set();

  yield* r(size - 1);
  
  function* r(size) {
    if (size <= 0) {
      let f = new Figure(vectors.slice(1));
      const id = f.id();
      if (!visitedIds.has(id)) {
        visitedIds.add(id);
        yield f;
      }
    } else {
      for (let i = 0; i < vectors.length; i++) {
        const v = vectors[i];

        for (let tryV of [new Vector(v.x, v.y - 1), new Vector(v.x + 1, v.y), new Vector(v.x, v.y + 1), new Vector(v.x - 1, v.y)]) {
          if (vectors.find(it => it.x == tryV.x && it.y == tryV.y) !== undefined) continue;

          vectors.push(tryV);
          yield * r(size - 1);
          vectors.pop();
        }
      }
    }
  }
}

function v(x, y) {
  return new Vector(x, y);
}

function assert(value, message) {
  if (!value) throw new Error("Assertion failed" + (message ? ": " + message : ""));
}

//let b = new Board(2, 4);
let b = new Board(8, 7);
let y = 0;
"9 9 9 0 0 9 9 9".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));
y++;
"9 9 9 9 0 9 9 9".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));
y++;
"9 9 9 0 0 0 0 9".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));
y++;
"9 0 0 0 0 0 0 9".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));
y++;
"9 0 0 0 0 0 0 0".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));
y++;
"0 0 0 0 0 0 9 9".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));
y++;
"9 9 0 0 9 9 9 9".split(" ").forEach((v,i) => b.set(i, y, parseInt(v)));

let mandatoryPart = new Figure([v(1, 0), v(1, 1), v(1, 2)]);
/*cut(b, 4, (f) => {
  for (let pos of fitFigure(f.toBoard().invert(), mandatoryPart)) return true;
  return false;
});
console.log("DONE");*/

function* cut(board, figureCount, figureFilter) {
  let freeCells = board.w * board.h - board.filledCount;
  if (freeCells % figureCount != 0) return;
  const figureSize = freeCells / figureCount;

  let ids = new Set();
  for (let f of makeFigure(figureSize)) {
    if (ids.has(f.id())) continue;
    if (figureFilter && !figureFilter(f)) continue;

    ids.add(f.id());
    ids.add(f.rotateClockwise().id());
    ids.add(f.rotateClockwise().rotateClockwise().id());
    ids.add(f.rotateClockwise().rotateClockwise().rotateClockwise().id());

    ids.add(f.mirror().id());
    ids.add(f.mirror().rotateClockwise().id());
    ids.add(f.mirror().rotateClockwise().rotateClockwise().id());
    ids.add(f.mirror().rotateClockwise().rotateClockwise().rotateClockwise().id());

    yield* solveForFigure(board, f);
  }
}

function* solveForFigure(board, figure) {
  let ids = new Set();
  let all = [];

  let f = figure;
  for (let i = 0; i < 4; i++) {
    if (ids.has(f.id())) continue;
    ids.add(f.id());
    all.push(f);
    f = f.rotateClockwise();
  }
  f = figure.mirror();
  for (let i = 0; i < 4; i++) {
    if (ids.has(f.id())) continue;
    ids.add(f.id());
    all.push(f);
    f = f.rotateClockwise();
  }

  // console.log("==============");
  // console.log(board.toString());
  // all.forEach(it => console.log(it.toString()));

  yield* r(board, 1);

  function* r(board, id) {
    for (let f of all) {
      for (let posV of fitFigure(board, f)) {
        board.placeFigure(f, posV.x, posV.y, id);
        if (board.filled()) {
          console.log("================");
          console.log("Figure:");
          console.log(f.toString());
          console.log("Board:");
          console.log(board.toString());

          yield board.clone();

          board.placeFigure(f, posV.x, posV.y, 0);
        }
        yield* r(board, id + 1);
        board.placeFigure(f, posV.x, posV.y, 0);
      }
    }
  }
}

function $(id) {
  return document.getElementById(id);
}

let state = {
  board: null,
  hint: [],
  w: 4,
  h: 4,
  fCount: 4,
  onChanged: () => {
    $('wValue').innerText = state.w;
    $('hValue').innerText = state.h;
    $('fCountValue').innerText = state.fCount;
  },
  buildBoard: () => {
    state.board = new Board(state.w, state.h);
    state.hint = [];
    state.showBoard();
  },
  showBoard: () => {
    let table = document.getElementById("board");
    table.innerHTML = "";
    for (let row = 0; row < state.h; row++) {
      let tr = document.createElement("tr");
      for (let col = 0; col < state.w; col++) {
        let td = document.createElement("td");

        const v = state.board.get(col, row);
        td.innerHTML = v == 0 ? "" : v;
        if (v == -1) td.classList.add("wall");

        if (state.hint.find(v => v.x == col && v.y == row) !== undefined) {
          td.classList.add("hint");
        }

        td.addEventListener("click", (e) => {
          e.preventDefault();

          if (state.board.get(col, row) == -1) {
            state.board.set(col, row, 0);
            td.classList.remove("wall");
          }
          else {
            state.board.set(col, row, -1);
            td.classList.add("wall");
          }
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
  solve: () => {
    console.log(state.board.toString());
    console.log(state.fCount);

    let filter = () => true;

    if (state.hint.length > 0) {
      let v0 = state.hint[0];
      let vectors = state.hint.slice(1).map(v => new Vector(v.x - v0.x, v.y - v0.y));
      let mandatoryPart = new Figure(vectors);
      filter = (f) => {
        for (let pos of fitFigure(f.toBoard().invert(), mandatoryPart)) return true;
        return false;
      }
    }

    for (let solution of cut(state.board, state.fCount, filter)) {
      state.board = solution;
      state.showBoard();
      break;
    }
    console.log("DONE");
  }
};
StateUi(state);
state.buildBoard();
