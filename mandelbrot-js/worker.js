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

  var color = {r: 0, g: 0, b: 0};

  for (var x = x1; x <= x2; x++) {
    for (var y = y1; y <= y2; y++) {
      var c = Complex.fromImage(x, y, c1, c2, width, height);
      var d = 255 - mOptimized(c, steps) / steps * 255;

      //var color = Color.fromHsv(Math.floor(d/10)*10/255, 1-Math.floor(d/10)*10/255, 1);
      fromHsvOptimized(Math.floor(d/10)*10/255, 1-Math.floor(d/10)*10/255, 1, color);

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

function mOptimized(c, steps) {
  var zre = c.re;
  var zim = c.im;
  var i = 1;
  var c = c0 || c;
  var newZre, newZim;
  do {
    newZre = zre * zre - zim * zim + c.re;
    newZim = zim * zre + zim * zre + c.im;
    zre = newZre;
    zim = newZim;
  } while (i++ < steps && zre * zre + zim * zim < 2);

  return i;
}

fromHsvOptimized = function (h, s, v, result) {
  var r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  result.r = Math.round(r * 255);
  result.g = Math.round(g * 255);
  result.b = Math.round(b * 255);
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