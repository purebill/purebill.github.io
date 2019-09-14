importScripts(
  "workerp.js",
  "domain.js",
  "cutter.js"
);

Workerp.message(function ({boardPojo, fCount, filterFigurePojo}) {
  let board = Board.fromPojo(boardPojo);

  let filter = () => true;
  if (filterFigurePojo !== null) {
    let figure = Figure.fromPojo(filterFigurePojo);
    filter = (f) => {
      for (let pos of fitFigure(f.toBoard().invert(), figure)) return true;
      return false;
    };
  }

  return new Promise(resolve => {
    for (let solution of cut(board, fCount, filter)) {
      resolve(solution.toPojo());
      break;
    }
    resolve(null);
  });
});