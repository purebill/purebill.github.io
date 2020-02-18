importScripts(
  "workerp.js",
  "invert.js"
);

let img;

Workerp.message(params => {
  if (params.img) {
    img = params.img;
    return Promise.resolve(true);
  } else if (img) {
    return Promise.resolve(params.interpolation
      ? invertImgLinear(img, params.tile, params.x, params.y, params.r)
      : invertImg(img, params.tile, params.x, params.y, params.r));
  } else {
    return Promise.resolve(null);
  }
});