importScripts(
  "serialization.js",
  "sparse-matrix.js",
  "workerp.js",
  "board.js",
  "board2.js"
);

let b;

Workerp.message(params => {
  if (params.board) {
    b = Serialization.unserialize(params.board);
    return Promise.resolve(true);
  } else if (params.step) {
    return Promise.resolve(b.step());
  } else {
    return Promise.resolve(b.toImageData());
  }
});