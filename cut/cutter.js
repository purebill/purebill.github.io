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
          // console.log("================");
          // console.log("Figure:");
          // console.log(f.toString());
          // console.log("Board:");
          // console.log(board.toString());

          yield board.clone();

          board.placeFigure(f, posV.x, posV.y, 0);
        }
        yield* r(board, id + 1);
        board.placeFigure(f, posV.x, posV.y, 0);
      }
    }
  }
}
