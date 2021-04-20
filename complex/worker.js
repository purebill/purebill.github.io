importScripts(
  "workerp.js",
  "complex.js"
);

let img;
const mapper = new Complex();

Workerp.message(params => {
  if (params.img) {
    img = params.img;
    return Promise.resolve(true);
  } else if (img) {
    return Promise.resolve(mapper.multiplyImg(img, params.tile, params.x, params.y, params.r, params.multiplier));
  } else {
    return Promise.resolve(null);
  }
});