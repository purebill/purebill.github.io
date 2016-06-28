importScripts(
  "workerp.js",
  "complex.js",
  "color.js"
);

var width, height, c1, c2, c0;

function computeImage(x1, y1, x2, y2, steps) {
  var w = x2 - x1 + 1;
  var h = y2 - y1 + 1;

  var imd = new ImageData(w, h);

  for (var x = x1; x <= x2; x++) {
    for (var y = y1; y <= y2; y++) {
      var c = Complex.fromImage(x, y, c1, c2, width, height);
      var d = 255 - m(c, steps) / steps * 255;
      var color = Color.fromHsv(d/255, 1, d/255);

      xi = x - x1;
      yi = y - y1;
      imd.data[(xi + yi * w) * 4 + 0] = color.r;
      imd.data[(xi + yi * w) * 4 + 1] = color.g;
      imd.data[(xi + yi * w) * 4 + 2] = color.b;
      imd.data[(xi + yi * w) * 4 + 3] = 255;
    }
  }

  return imd;
}

function m(c, steps) {
  var z = c;
  var i = 1;
  do {
    z = z.mul(z).add(c0 || c);
  } while (i++ < steps && z.abs() < 2);

  return i;
}


Workerp.message(function (params) {
    width = params.width;
    height = params.height;
    c1 = params.c1;
    c2 = params.c2;
    c0 = params.c0;
    var steps = params.steps || 255;
    return Promise.resolve(computeImage(params.x1, params.y1, params.x2, params.y2, steps));
});