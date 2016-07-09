importScripts(
  "workerp.js",
  "complex.js",
  "color.js"
);

var width, height, c1, c2, c0, colors;

function computeImage(x1, y1, x2, y2, steps) {
  var w = x2 - x1 + 1;
  var h = y2 - y1 + 1;
  var zoom = Math.round(Math.log2(1/Math.abs(c1.re - c2.re)));
  zoom = zoom > 0 ? zoom : 1;

  var imd = new ImageData(w, h);

  var color = {r: 0, g: 0, b: 0};
  var iterations;
  var c, d;
  for (var x = x1; x <= x2; x++) {
    for (var y = y1; y <= y2; y++) {
      c = Complex.fromImage(x, y, c1, c2, width, height);

      iterations = mOptimized(c, steps);
      color = colors[iterations];

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
  var i = 0;
  do {
    z = z.mul(z).add(c0 || c);
  } while (i++ < steps - 1 && z.abs() < 2);

  return i;
}

function mOptimized(c, steps) {
  var zre = c.re;
  var zim = c.im;
  var i = 0;
  var c = c0 || c;
  var newZre, newZim;
  do {
    newZre = zre * zre - zim * zim + c.re;
    newZim = zim * zre + zim * zre + c.im;
    zre = newZre;
    zim = newZim;
  } while (i++ < steps -1 && zre * zre + zim * zim < 4);

  return i;
}

Workerp.message(function (params) {
  if (params.palete) {
    colors = params.palete;
    return Promise.resolve(true);
  } else {
    width = params.width;
    height = params.height;
    
    c1 = params.c1;
    c2 = params.c2;
    c0 = params.c0;
    
    var steps = params.steps || 255;

    return Promise.resolve(
      computeImage(params.x1, params.y1, params.x2, params.y2, steps));
  }
});