importScripts(
  "workerp.js",
  "convolute.js"
);

var images = {};
var tileCache = {};

Workerp.message(params => {
  if (params.img) {
    images[params.id] = params.img;
    return Promise.resolve(true);
  } else {
    var img = images[params.imgId];

    var cacheKey = params.tile.width + ":" + params.tile.height;
    if (tileCache[cacheKey] === undefined) {
      tileCache[cacheKey] = new ImageData(params.tile.width, params.tile.height);
      console.debug("cache miss: " + cacheKey);
    }

    return Promise.resolve(convolute(img, params.kernel, params.tile, tileCache[cacheKey]));
  }
});